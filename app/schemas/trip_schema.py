from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TripCreate(BaseModel):
    pet_id: int
    duration_minutes: int = 30

class TripResponse(BaseModel):
    status: str
    message: str
    eta_seconds: int

class DiaryEntry(BaseModel):
    id: int
    title: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
