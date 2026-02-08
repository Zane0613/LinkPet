from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class PetBase(BaseModel):
    name: str

class PetCreate(PetBase):
    answers: List[str]  # List of answer IDs or values

class PetClaim(BaseModel):
    pass # No fields needed for claiming

class UserNicknameUpdate(BaseModel):
    nickname: str

class HeatRequest(BaseModel):
    answer_index: int # The answer index selected by user
    question_index: int # Which question was answered

class PetNameUpdate(BaseModel):
    name: str

class PetReadDiaryUpdate(BaseModel):
    last_read_diary_id: int

class PetOut(PetBase):
    id: int
    template_id: Optional[str] = None
    personality_prompt: Optional[str] = None
    dynamic_traits: Dict[str, Any]
    owner_id: int
    status: str
    last_status_update: Optional[int] = 0
    
    # Hatching fields
    hatch_progress_seconds: int = 0
    heat_buffer_seconds: int = 0
    frozen_since: Optional[int] = None
    hatch_answers: Optional[List[Any]] = []
    last_read_diary_id: Optional[int] = 0

    class Config:
        from_attributes = True
