from pydantic import BaseModel

class ChatMessage(BaseModel):
    pet_id: int
    message: str

class ChatResponse(BaseModel):
    reply: str
