"""Database models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from ulid import new as new_ulid
from app.database import Base


def generate_ulid():
    """Generate a new ULID string."""
    return str(new_ulid())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_ulid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Poll(Base):
    __tablename__ = "polls"

    id = Column(String, primary_key=True, default=generate_ulid)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    winner_id = Column(String, nullable=True)  # Set after reveal

    # Relationships
    participants = relationship("Participant", back_populates="poll", cascade="all, delete-orphan")
    options = relationship("Option", back_populates="poll", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="poll", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(String, primary_key=True, default=generate_ulid)
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    ready = Column(Boolean, default=False, nullable=False)

    poll = relationship("Poll", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        Index("ix_participants_poll_user", "poll_id", "user_id", unique=True),
    )


class Option(Base):
    __tablename__ = "options"

    id = Column(String, primary_key=True, default=generate_ulid)
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    label = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    poll = relationship("Poll", back_populates="options")
    votes = relationship("Vote", back_populates="option")

    __table_args__ = (
        Index("ix_options_poll", "poll_id"),
    )


class Vote(Base):
    __tablename__ = "votes"

    id = Column(String, primary_key=True, default=generate_ulid)
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False)
    option_id = Column(String, ForeignKey("options.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=True)  # 0-10 or None
    veto = Column(Boolean, default=False, nullable=False)

    poll = relationship("Poll", back_populates="votes")
    option = relationship("Option", back_populates="votes")
    user = relationship("User")

    __table_args__ = (
        Index("ix_votes_poll_option_user", "poll_id", "option_id", "user_id", unique=True),
    )

