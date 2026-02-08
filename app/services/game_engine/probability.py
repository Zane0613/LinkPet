import random
from typing import Dict, Any

# Mock Database of Scenes and Events
SCENES = [
    {"id": "park", "name": "Sunny Park", "tags": ["nature", "play"]},
    {"id": "bar", "name": "Cozy Bar", "tags": ["relax", "social"]},
    {"id": "concert", "name": "Rock Concert", "tags": ["music", "loud"]},
    {"id": "library", "name": "Quiet Library", "tags": ["knowledge", "quiet"]},
    {"id": "statue", "name": "Ancient Statue", "tags": ["history", "landmark"]},
    {"id": "volcano_eruption", "name": "Volcano", "tags": ["adventure", "danger"]}
]

EVENTS = [
    {"id": "meet_cat", "text": "Met a stray cat.", "tags": ["social"]},
    {"id": "found_coin", "text": "Found a shiny coin.", "tags": ["lucky"]},
    {"id": "rain", "text": "It started raining suddenly.", "tags": ["weather"]},
    {"id": "chase_butterfly", "text": "Chased a blue butterfly.", "tags": ["nature"]},
    {"id": "busker", "text": "Listened to a street musician.", "tags": ["art"]}
]

def roll_trip_outcome(pet_stats: Dict[str, Any] = {}) -> Dict[str, Any]:
    """
    Decides where the pet goes and what happens based on probability.
    In a real version, pet_stats (items, personality) would weight these probabilities.
    """
    
    # 1. Pick a Scene
    scene = random.choice(SCENES)
    
    # 2. Pick an Event
    # Simple random for MVP
    event = random.choice(EVENTS)
    
    # 3. Determine if they bring back a souvenir (20% chance)
    got_item = random.random() < 0.2
    item = "Shiny Stone" if got_item else None
    
    return {
        "scene": scene,
        "event": event,
        "item": item,
        "weather": random.choice(["Sunny", "Cloudy", "Rainy"])
    }
