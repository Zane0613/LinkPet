from app.models.pet import Pet
from typing import Dict, Any
from app.services.llm_service import llm_service

def generate_diary_entry(pet: Pet, trip_data: Dict[str, Any]) -> str:
    """
    Generates a diary entry string using LLM based on trip outcome and pet personality.
    """
    scene = trip_data["scene"]["name"]
    event = trip_data["event"]["text"]
    weather = trip_data["weather"]
    item = trip_data.get("item")
    
    # Construct System Prompt
    system_prompt = f"""
    You are {pet.name}, a {pet.template_id} pet.
    Your personality traits are: {pet.personality_prompt}.
    You just came back from a trip. Write a short, cute diary entry (max 50 words) about your experience.
    The tone should be consistent with your personality.
    """
    
    # Construct Context
    context = f"""
    Location: {scene}
    Weather: {weather}
    Event: {event}
    Item Found: {item if item else "Nothing"}
    """
    
    return llm_service.generate_narrative_safe(system_prompt, context)
