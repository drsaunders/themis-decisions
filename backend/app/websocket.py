"""WebSocket manager for real-time updates."""
from typing import Dict, Set
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections per poll."""
    
    def __init__(self):
        # poll_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, poll_id: str):
        """Connect a client to a poll."""
        await websocket.accept()
        if poll_id not in self.active_connections:
            self.active_connections[poll_id] = set()
        self.active_connections[poll_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, poll_id: str):
        """Disconnect a client from a poll."""
        if poll_id in self.active_connections:
            self.active_connections[poll_id].discard(websocket)
            if not self.active_connections[poll_id]:
                del self.active_connections[poll_id]
    
    async def broadcast(self, poll_id: str, message: dict):
        """Broadcast a message to all connected clients for a poll."""
        if poll_id not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[poll_id]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.active_connections[poll_id].discard(connection)
    
    async def send_participant_joined(self, poll_id: str, participant_count: int):
        """Broadcast participant joined event."""
        await self.broadcast(poll_id, {
            "type": "participant_joined",
            "participants": participant_count,
        })
    
    async def send_participant_left(self, poll_id: str, participant_count: int):
        """Broadcast participant left event."""
        await self.broadcast(poll_id, {
            "type": "participant_left",
            "participants": participant_count,
        })
    
    async def send_option_added(self, poll_id: str, option_id: str, label: str):
        """Broadcast option added event."""
        await self.broadcast(poll_id, {
            "type": "option_added",
            "option": {
                "id": option_id,
                "label": label,
            },
        })
    
    async def send_ready_counts(self, poll_id: str, ready: int, participants: int):
        """Broadcast ready count update."""
        await self.broadcast(poll_id, {
            "type": "ready_counts",
            "ready": ready,
            "participants": participants,
        })
    
    async def send_reveal(self, poll_id: str, winner_id: str, winner_label: str):
        """Broadcast reveal event."""
        await self.broadcast(poll_id, {
            "type": "reveal",
            "winner": {
                "id": winner_id,
                "label": winner_label,
            },
        })
    
    async def send_status(self, websocket: WebSocket, status: dict):
        """Send status snapshot to a single client."""
        try:
            await websocket.send_json({
                "type": "status",
                **status,
            })
        except Exception:
            pass


class GlobalConnectionManager:
    """Manages global WebSocket connections (e.g., for home screen)."""
    
    def __init__(self):
        # Set of WebSocket connections for global updates
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        """Connect a client for global updates."""
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a client from global updates."""
        self.active_connections.discard(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.active_connections.discard(connection)
    
    async def send_poll_created(self, poll_id: str, title: str, created_at: str, creator_id: str = None, princess_mode: bool = False):
        """Broadcast poll created event."""
        await self.broadcast({
            "type": "poll_created",
            "poll": {
                "pollId": poll_id,
                "title": title,
                "created_at": created_at,
                "winner_id": None,
                "creator_id": creator_id,
                "princess_mode": princess_mode,
            },
        })
    
    async def send_poll_deleted(self, poll_id: str):
        """Broadcast poll deleted event."""
        await self.broadcast({
            "type": "poll_deleted",
            "pollId": poll_id,
        })
    
    async def send_poll_cloned(self, poll_id: str, title: str, created_at: str, creator_id: str = None, princess_mode: bool = False):
        """Broadcast poll cloned event."""
        await self.broadcast({
            "type": "poll_cloned",
            "poll": {
                "pollId": poll_id,
                "title": title,
                "created_at": created_at,
                "winner_id": None,
                "creator_id": creator_id,
                "princess_mode": princess_mode,
            },
        })


manager = ConnectionManager()
global_manager = GlobalConnectionManager()

