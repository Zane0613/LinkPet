from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.models.pet import Pet
from app.schemas.chat_schema import ChatMessage, ChatResponse
from app.services.agent.memory import save_memory, retrieve_memories, build_prompt
from app.services.llm_service import llm_service
import json
import random

router = APIRouter()

@router.post("/send")
def send_message(chat_in: ChatMessage, db: Session = Depends(get_db)):
    # 1. Get Pet
    pet = db.query(Pet).filter(Pet.id == chat_in.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # 2. Retrieve Context (RAG)
    memories = retrieve_memories(db, pet.id, chat_in.message)

    # 3. Build Prompt
    system_prompt = build_prompt(pet, chat_in.message, memories)

    # 4. Save User Message First
    save_memory(db, pet.id, f"User: {chat_in.message}", type="user_chat")

    # Generator for Streaming Response
    def generate():
        # Create a new session for the generator since the request session might be closed
        session = SessionLocal()
        full_reply = ""
        full_reasoning = ""
        try:
            stream = llm_service.get_chat_response_stream(system_prompt, chat_in.message)
            for chunk in stream:
                if 'error' in chunk:
                    yield f"data: {json.dumps({'error': chunk['error']})}\n\n"
                    break
                
                # Accumulate for saving to DB later
                if 'content' in chunk:
                    full_reply += chunk['content']
                if 'reasoning' in chunk:
                    full_reasoning += chunk['reasoning']
                
                # Yield chunk to client
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # 5. Save Interaction to Memory (after full response)
            if full_reply:
                # Append reasoning to the saved message if available?
                # For now, just save the reply content as the chat history usually doesn't need reasoning.
                save_memory(session, pet.id, f"Me: {full_reply}", type="pet_chat")
                
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            print(f"Stream Error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            session.close()

    return StreamingResponse(generate(), media_type="text/event-stream")
