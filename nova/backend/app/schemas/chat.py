from pydantic import BaseModel
from typing import List, Optional

class ChatMessageResponse(BaseModel):
    id: int
    repair_id: int
    sender: str
    author_name: str
    message: str
    created_at: str
    is_read: bool

    class Config:
        from_attributes = True

class ChatInboxItem(BaseModel):
    client_id: int
    client_name: str
    client_phone: Optional[str] = None
    latest_message: str
    latest_message_date: str
    unread_count: int
    repair_id: int

class ChatSendMessageRequest(BaseModel):
    message: str

class ChatUnreadCountResponse(BaseModel):
    unread_count: int
