from sqlalchemy.orm import Session
from app.models.memory import Memory
from app.models.pet import Pet
from datetime import datetime
import json
import numpy as np
from app.services.llm_service import llm_service
import logging

logger = logging.getLogger(__name__)

def get_embedding(text: str) -> list:
    """
    Wrapper to call LLM service to get embeddings.
    """
    return llm_service.get_embedding(text)

def cosine_similarity(v1: list, v2: list) -> float:
    """
    Calculate cosine similarity between two vectors.
    """
    if not v1 or not v2:
        return 0.0
    
    a = np.array(v1)
    b = np.array(v2)
    
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(np.dot(a, b) / (norm_a * norm_b))

def save_memory(db: Session, pet_id: int, content: str, type: str = "user_chat"):
    embedding = get_embedding(content)
    
    # Store embedding as JSON for SQLite compatibility
    memory = Memory(
        pet_id=pet_id,
        content=content,
        embedding=json.dumps(embedding) if embedding else None, 
        type=type,
        timestamp=datetime.utcnow()
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory

def retrieve_memories(db: Session, pet_id: int, query: str, limit: int = 5):
    """
    Retrieves memories based on semantic similarity.
    Fallback to recency if query embedding fails or no memories exist.
    """
    # 1. Get all memories for the pet (or a reasonable recent window to avoid perf issues)
    # For MVP with SQLite, fetching last 100 memories is fine.
    candidate_memories = db.query(Memory).filter(
        Memory.pet_id == pet_id
    ).order_by(Memory.timestamp.desc()).limit(100).all()
    
    if not candidate_memories:
        return []

    # 2. Get query embedding
    query_embedding = get_embedding(query)
    
    if not query_embedding:
        logger.warning("Failed to generate embedding for query, falling back to recent memories.")
        return candidate_memories[:limit]

    # 3. Calculate similarities
    scored_memories = []
    for mem in candidate_memories:
        if not mem.embedding:
            continue
            
        try:
            mem_embedding = json.loads(mem.embedding) if isinstance(mem.embedding, str) else mem.embedding
            score = cosine_similarity(query_embedding, mem_embedding)
            scored_memories.append((score, mem))
        except Exception as e:
            logger.error(f"Error parsing embedding for memory {mem.id}: {e}")
            continue
            
    # 4. Sort by score (descending)
    scored_memories.sort(key=lambda x: x[0], reverse=True)
    
    # 5. Return top K memories
    top_k = [m[1] for m in scored_memories[:limit]]
    
    # If we didn't find enough semantic matches, pad with recent ones? 
    # Or just return what we found. Let's return what we found, but if empty, return recent.
    if not top_k and candidate_memories:
         return candidate_memories[:limit]
         
    # Reverse to chronological order for LLM context (though semantic relevance is more important, 
    # usually LLMs like context in some order. But here they are disjoint snippets. 
    # Let's keep them sorted by relevance or maybe time? 
    # Standard RAG usually just provides snippets. 
    # Let's sort the selected top_k by time to reconstruct a timeline of relevant events.)
    top_k.sort(key=lambda x: x.timestamp)
    
    return top_k

def build_prompt(pet: Pet, user_input: str, memories: list) -> str:
    context_str = "\n".join([f"- [{m.timestamp.strftime('%Y-%m-%d %H:%M')}] {m.content}" for m in memories])
    
    system_prompt = f"""You are {pet.name}, a {pet.template_id}.
{pet.personality_prompt}

Your Core Traits:
{json.dumps(pet.dynamic_traits)}

Relevant Memories:
{context_str}

Instruction:
Reply to the user's message based on your personality and memories. 
Keep your response short (under 50 words), engaging, and in character.
Do not start with "User:" or "Pet:". Just say what you would say.
IMPORTANT: You MUST reply in CHINESE (简体中文), regardless of the user's language.
"""
    return system_prompt
