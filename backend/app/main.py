"""FastAPI application entry point."""
import os
import json
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.database import get_db, engine, Base
from app.models import User, Poll, Participant, Option, Vote
from app.schemas import (
    UserCreate, UserResponse,
    PollCreate, PollResponse,
    JoinPollRequest, JoinPollResponse,
    OptionCreate, OptionResponse,
    VoteRequest, VoteResponse,
    ReadyRequest, ReadyResponse,
    StatusResponse, RevealResponse,
)
from app.scoring import compute_winner
from app.websocket import manager

app = FastAPI(title="Themis API")


@app.on_event("startup")
async def startup_event():
    """Ensure database tables exist on startup."""
    Base.metadata.create_all(bind=engine)


# CORS configuration
allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    user = User(name=user_data.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(userId=user.id, name=user.name)


@app.get("/polls", response_model=list[PollResponse])
async def list_polls(db: Session = Depends(get_db)):
    """List all polls."""
    polls = db.query(Poll).order_by(Poll.created_at.desc()).all()
    return [
        PollResponse(pollId=poll.id, title=poll.title, created_at=poll.created_at.isoformat())
        for poll in polls
    ]


@app.post("/polls", response_model=PollResponse)
async def create_poll(poll_data: PollCreate, db: Session = Depends(get_db)):
    """Create a new poll."""
    poll = Poll(title=poll_data.title)
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return PollResponse(pollId=poll.id, title=poll.title, created_at=poll.created_at.isoformat())


@app.post("/polls/{poll_id}/join", response_model=JoinPollResponse)
async def join_poll(poll_id: str, request: JoinPollRequest, db: Session = Depends(get_db)):
    """Join a poll as a participant."""
    # Check if poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if user exists
    user = db.query(User).filter(User.id == request.userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a participant
    existing = db.query(Participant).filter(
        Participant.poll_id == poll_id,
        Participant.user_id == request.userId
    ).first()
    
    if existing:
        return JoinPollResponse(participantId=existing.id)
    
    # Create new participant
    participant = Participant(poll_id=poll_id, user_id=request.userId, ready=False)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    
    # Broadcast participant joined
    participant_count = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id
    ).scalar()
    await manager.send_participant_joined(poll_id, participant_count)
    
    return JoinPollResponse(participantId=participant.id)


@app.get("/polls/{poll_id}/options", response_model=list[OptionResponse])
async def list_options(poll_id: str, db: Session = Depends(get_db)):
    """List all options for a poll."""
    options = db.query(Option).filter(Option.poll_id == poll_id).order_by(Option.created_at).all()
    return [OptionResponse(id=opt.id, label=opt.label) for opt in options]


@app.post("/polls/{poll_id}/options", response_model=OptionResponse)
async def create_option(poll_id: str, option_data: OptionCreate, db: Session = Depends(get_db)):
    """Add an option to a poll."""
    # Check if poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    option = Option(poll_id=poll_id, label=option_data.label)
    db.add(option)
    db.commit()
    db.refresh(option)
    
    # Broadcast option added
    await manager.send_option_added(poll_id, option.id, option.label)
    
    return OptionResponse(id=option.id, label=option.label)


@app.put("/polls/{poll_id}/vote", response_model=VoteResponse)
async def submit_vote(poll_id: str, vote_data: VoteRequest, db: Session = Depends(get_db)):
    """Submit or update votes for a poll."""
    # Check if poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if user is a participant
    participant = db.query(Participant).filter(
        Participant.poll_id == poll_id,
        Participant.user_id == vote_data.userId
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="User not a participant")
    
    # Validate ratings
    for entry in vote_data.entries:
        if entry.rating is not None and (entry.rating < 0 or entry.rating > 10):
            raise HTTPException(status_code=400, detail="Rating must be between 0 and 10")
    
    # Process each vote entry
    for entry in vote_data.entries:
        # Check if option exists
        option = db.query(Option).filter(
            Option.id == entry.optionId,
            Option.poll_id == poll_id
        ).first()
        if not option:
            continue  # Skip invalid options
        
        # Find or create vote
        vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.option_id == entry.optionId,
            Vote.user_id == vote_data.userId
        ).first()
        
        if vote:
            # Update existing vote
            vote.rating = entry.rating if not entry.veto else None
            vote.veto = entry.veto
        else:
            # Create new vote
            vote = Vote(
                poll_id=poll_id,
                option_id=entry.optionId,
                user_id=vote_data.userId,
                rating=entry.rating if not entry.veto else None,
                veto=entry.veto
            )
            db.add(vote)
    
    db.commit()
    
    return VoteResponse(ok=True)


@app.post("/polls/{poll_id}/ready", response_model=ReadyResponse)
async def mark_ready(poll_id: str, request: ReadyRequest, db: Session = Depends(get_db)):
    """Mark a participant as ready."""
    participant = db.query(Participant).filter(
        Participant.poll_id == poll_id,
        Participant.user_id == request.userId
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    participant.ready = True
    db.commit()
    
    # Get counts
    ready_count = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id,
        Participant.ready == True
    ).scalar()
    
    total_participants = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id
    ).scalar()
    
    # Broadcast ready counts
    await manager.send_ready_counts(poll_id, ready_count, total_participants)
    
    # Auto-reveal if all participants are ready
    if ready_count >= total_participants and total_participants > 0:
        poll = db.query(Poll).filter(Poll.id == poll_id).first()
        if poll and not poll.winner_id:  # Only reveal once
            winner_id = compute_winner(poll_id, db)
            if winner_id:
                poll.winner_id = winner_id
                db.commit()
                winner_option = db.query(Option).filter(Option.id == winner_id).first()
                if winner_option:
                    await manager.send_reveal(poll_id, winner_option.id, winner_option.label)
    
    return ReadyResponse(readyCount=ready_count, totalParticipants=total_participants)


@app.get("/polls/{poll_id}/status", response_model=StatusResponse)
async def get_status(poll_id: str, db: Session = Depends(get_db)):
    """Get poll status."""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    ready_count = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id,
        Participant.ready == True
    ).scalar()
    
    total_participants = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id
    ).scalar()
    
    option_count = db.query(func.count(Option.id)).filter(
        Option.poll_id == poll_id
    ).scalar()
    
    winner = None
    if poll.winner_id:
        winner_option = db.query(Option).filter(Option.id == poll.winner_id).first()
        if winner_option:
            winner = OptionResponse(id=winner_option.id, label=winner_option.label)
    
    return StatusResponse(
        readyCount=ready_count,
        totalParticipants=total_participants,
        optionCount=option_count,
        winner=winner
    )


@app.post("/polls/{poll_id}/reveal", response_model=RevealResponse)
async def reveal_winner(poll_id: str, db: Session = Depends(get_db)):
    """Reveal the winner (only if all participants are ready)."""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if all participants are ready
    total_participants = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id
    ).scalar()
    
    ready_count = db.query(func.count(Participant.id)).filter(
        Participant.poll_id == poll_id,
        Participant.ready == True
    ).scalar()
    
    if ready_count < total_participants or total_participants == 0:
        raise HTTPException(status_code=400, detail="Not all participants are ready")
    
    # Compute winner
    winner_id = compute_winner(poll_id, db)
    if not winner_id:
        raise HTTPException(status_code=400, detail="Could not compute winner")
    
    # Store winner
    poll.winner_id = winner_id
    db.commit()
    
    # Get winner option
    winner_option = db.query(Option).filter(Option.id == winner_id).first()
    if not winner_option:
        raise HTTPException(status_code=500, detail="Winner option not found")
    
    # Broadcast reveal
    await manager.send_reveal(poll_id, winner_option.id, winner_option.label)
    
    return RevealResponse(winner=OptionResponse(id=winner_option.id, label=winner_option.label))


@app.websocket("/ws/polls/{poll_id}")
async def websocket_endpoint(websocket: WebSocket, poll_id: str):
    """WebSocket endpoint for real-time poll updates."""
    await manager.connect(websocket, poll_id)
    
    try:
        while True:
            # Wait for client messages (optional)
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "request_status":
                    # Send status snapshot
                    db = next(get_db())
                    try:
                        poll = db.query(Poll).filter(Poll.id == poll_id).first()
                        if poll:
                            ready_count = db.query(func.count(Participant.id)).filter(
                                Participant.poll_id == poll_id,
                                Participant.ready == True
                            ).scalar()
                            total_participants = db.query(func.count(Participant.id)).filter(
                                Participant.poll_id == poll_id
                            ).scalar()
                            option_count = db.query(func.count(Option.id)).filter(
                                Option.poll_id == poll_id
                            ).scalar()
                            
                            await manager.send_status(websocket, {
                                "participants": total_participants,
                                "ready": ready_count,
                                "optionCount": option_count,
                            })
                    finally:
                        db.close()
            except json.JSONDecodeError:
                pass  # Ignore invalid JSON
    except WebSocketDisconnect:
        manager.disconnect(websocket, poll_id)
        # Broadcast participant left
        db = next(get_db())
        try:
            participant_count = db.query(func.count(Participant.id)).filter(
                Participant.poll_id == poll_id
            ).scalar()
            await manager.send_participant_left(poll_id, participant_count)
        finally:
            db.close()

