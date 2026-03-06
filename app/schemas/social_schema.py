from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserChatBase(BaseModel):
    user_id_1: int
    user_id_2: int
    is_active: bool

class UserChatResponse(UserChatBase):
    id: int
    created_at: datetime
    other_user_name: Optional[str] = None
    other_user_email: Optional[str] = None

    class Config:
        orm_mode = True

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    created_at: datetime
    sender_name: Optional[str] = None

    class Config:
        orm_mode = True
