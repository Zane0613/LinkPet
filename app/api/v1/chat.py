from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.pet import Pet
from app.schemas.chat_schema import ChatMessage, ChatResponse
from app.services.agent.memory import save_memory, retrieve_memories, build_prompt
from app.services.llm_service import llm_service

import random

router = APIRouter()

@router.post("/send", response_model=ChatResponse)
def send_message(chat_in: ChatMessage, db: Session = Depends(get_db)):
    # 1. Get Pet
    pet = db.query(Pet).filter(Pet.id == chat_in.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # 2. Retrieve Context (RAG)
    memories = retrieve_memories(db, pet.id, chat_in.message)

    # 3. Build Prompt
    system_prompt = build_prompt(pet, chat_in.message, memories)

    # 4. Generate Response (Real LLM)
    reply_text = llm_service.get_chat_response_safe(system_prompt, chat_in.message)

    # 5. Save Interaction to Memory
    # Save user message
    save_memory(db, pet.id, f"User: {chat_in.message}", type="user_chat")
    # Save pet response
    save_memory(db, pet.id, f"Me: {reply_text}", type="pet_chat")

    return {"reply": reply_text}
