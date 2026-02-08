from sqlalchemy.orm import Session
from app.models.memory import Memory
from app.models.pet import Pet
from datetime import datetime
import json

# Mock Embedding function for MVP (Since we don't have OpenAI key yet)
# In production, use OpenAI embeddings or HuggingFace
def get_embedding(text: str) -> list:
    # Return a random vector or simple hash-based vector for testing
    # 1536 is OpenAI embedding dimension
    return [0.1] * 1536 

def save_memory(db: Session, pet_id: int, content: str, type: str = "user_chat"):
    embedding = get_embedding(content)
    
    # Store embedding as JSON for SQLite compatibility
    # In Postgres with pgvector, this would be a direct vector type
    memory = Memory(
        pet_id=pet_id,
        content=content,
        embedding=json.dumps(embedding) if isinstance(embedding, list) else embedding, 
        type=type,
        timestamp=datetime.utcnow()
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory

def retrieve_memories(db: Session, pet_id: int, query: str, limit: int = 5):
    """
    Simple keyword-based retrieval for MVP since we are using SQLite.
    In production with pgvector, this would use cosine similarity.
    """
    # Naive implementation: fetch recent memories
    # TODO: Implement better search if possible with SQLite or just return recent
    
    # Returning recent 5 memories for context
    memories = db.query(Memory).filter(
        Memory.pet_id == pet_id
    ).order_by(Memory.timestamp.desc()).limit(limit).all()
    
    # Reverse to chronological order for LLM context
    return memories[::-1]

def build_prompt(pet: Pet, user_input: str, memories: list) -> str:
    context_str = "\n".join([f"- {m.content}" for m in memories])
    
    system_prompt = f"""You are {pet.name}, a {pet.template_id}.
{pet.personality_prompt}

Your Core Traits:
{json.dumps(pet.dynamic_traits)}

Recent Memories:
{context_str}

Instruction:
Reply to the user's message based on your personality and memories. 
Keep your response short (under 50 words), engaging, and in character.
Do not start with "User:" or "Pet:". Just say what you would say.
"""
    return system_prompt
