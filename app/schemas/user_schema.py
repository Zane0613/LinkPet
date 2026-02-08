from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None

class UserLogin(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    full_name: Optional[str] = None
    nickname: Optional[str] = None

    class Config:
        from_attributes = True
