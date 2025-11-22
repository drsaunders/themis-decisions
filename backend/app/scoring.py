"""Harmonic mean scoring algorithm with tie-breakers."""
import statistics
import random
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models import Poll, Option, Vote


def compute_winner(poll_id: str, db: Session) -> Optional[str]:
    """
    Compute winner using harmonic mean scoring.
    
    For each option:
    1. If ANY user vetoed the option, exclude it entirely
    2. Collect all non-None ratings
    3. If no ratings remain, option is excluded
    4. Score = harmonic mean
    
    Tie-breakers (in order):
    1. Lower variance (more consistent ratings)
    2. Higher median
    3. More raters
    4. Seeded random (using poll_id)
    """
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        return None

    options = db.query(Option).filter(Option.poll_id == poll_id).all()
    if not options:
        return None

    # Get all votes for this poll
    votes = db.query(Vote).filter(Vote.poll_id == poll_id).all()

    # Build vote map: option_id -> list of (user_id, rating, veto)
    option_votes: Dict[str, List[tuple]] = {}
    for vote in votes:
        if vote.option_id not in option_votes:
            option_votes[vote.option_id] = []
        option_votes[vote.option_id].append((vote.user_id, vote.rating, vote.veto))

    scored_options = []

    for option in options:
        votes_for_option = option_votes.get(option.id, [])
        
        # Check if ANY user vetoed this option - if so, exclude it entirely
        # A vetoed option can NEVER be the winner, regardless of other ratings
        # Query directly from database to ensure we have the latest veto status
        vetoed_votes = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.option_id == option.id,
            Vote.veto == True
        ).first()
        
        if vetoed_votes is not None:
            continue  # Vetoed options are never winners
        
        # Filter: only include non-None ratings
        valid_ratings = []
        for user_id, rating, veto in votes_for_option:
            if rating is not None:
                valid_ratings.append(rating)
        
        if not valid_ratings:
            continue  # Option excluded
        
        # Compute harmonic mean
        
        # Harmonic mean = n / sum(1/rating)
        # Handle zero ratings (treat as 0.1 to avoid division by zero)
        reciprocal_sum = sum(1.0 / max(r, 0.1) for r in valid_ratings)
        harmonic_mean = len(valid_ratings) / reciprocal_sum if reciprocal_sum > 0 else 0.0
        
        variance = statistics.variance(valid_ratings) if len(valid_ratings) > 1 else 0.0
        median = statistics.median(valid_ratings)
        num_raters = len(valid_ratings)
        
        scored_options.append({
            "option_id": option.id,
            "score": harmonic_mean,
            "variance": variance,
            "median": median,
            "num_raters": num_raters,
        })
    
    if not scored_options:
        return None
    
    # Sort by score (descending), then tie-breakers
    # Tie-breakers: lower variance, higher median, more raters
    random.seed(poll_id)  # Seed for final tie-breaker
    
    scored_options.sort(
        key=lambda x: (
            -x["score"],  # Higher score first
            x["variance"],  # Lower variance first
            -x["median"],  # Higher median first
            -x["num_raters"],  # More raters first
            random.random()  # Final random tie-breaker
        )
    )
    
    return scored_options[0]["option_id"]

