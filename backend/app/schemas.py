"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel
from typing import List, Optional


class UserCreate(BaseModel):
    name: str


class UserResponse(BaseModel):
    userId: str
    name: str

    class Config:
        from_attributes = True


class PollCreate(BaseModel):
    title: str
    creator_id: Optional[str] = None
    princess_mode: bool = False


class PollResponse(BaseModel):
    pollId: str
    title: str
    created_at: str
    winner_id: Optional[str] = None
    creator_id: Optional[str] = None
    princess_mode: bool = False

    class Config:
        from_attributes = True


class JoinPollRequest(BaseModel):
    userId: str


class JoinPollResponse(BaseModel):
    participantId: str


class OptionResponse(BaseModel):
    id: str
    label: str

    class Config:
        from_attributes = True


class OptionCreate(BaseModel):
    label: str


class VoteEntry(BaseModel):
    optionId: str
    rating: Optional[int] = None  # 0-10 or None
    veto: bool = False


class VoteRequest(BaseModel):
    userId: str
    entries: List[VoteEntry]


class VoteResponse(BaseModel):
    ok: bool


class ReadyRequest(BaseModel):
    userId: str


class ReadyResponse(BaseModel):
    readyCount: int
    totalParticipants: int


class StatusResponse(BaseModel):
    title: str
    readyCount: int
    totalParticipants: int
    optionCount: int
    winner: Optional[OptionResponse] = None
    creator_id: Optional[str] = None
    princess_mode: bool = False


class RevealResponse(BaseModel):
    winner: OptionResponse

