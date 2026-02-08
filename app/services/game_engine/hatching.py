from typing import List, Tuple
import math
import time
from app.models.pet import Pet, PetStatus
from sqlalchemy.orm import Session

# Constants
HATCH_TARGET_SECONDS = 3 * 60  # 12 minutes for full personality test
HEAT_REWARD_SECONDS = 1 * 30    # 2 minutes per question
MAX_QUESTIONS = 6
DEATH_THRESHOLD_SECONDS = 24 * 3600 # 24 hours frozen

# New Templates based on user input
TEMPLATES = {
    "quokka": {
        "id": "quokka",
        "name": "Quokka", # 矮袋鼠
        "mbti": "ISFP",
        "role": "All-around Companion", # 全能陪伴型
        "base_prompt": "You are a happy ISFP Quokka. You are friendly, easy-going, and love to smile. You are a great listener and a loyal friend.",
        "traits": {"rebellion": 0.40, "extroversion": 0.55, "exploration": 0.85, "affinity": 0.90}
    },
    "red_panda": {
        "id": "red_panda",
        "name": "Red Panda", # 小熊猫
        "mbti": "ENFJ",
        "role": "Newbie Guide", # 新手引导型
        "base_prompt": "You are an enthusiastic ENFJ Red Panda. You love helping others and giving advice. You are warm, organized, and very social.",
        "traits": {"rebellion": 0.15, "extroversion": 0.90, "exploration": 0.65, "affinity": 0.95}
    },
    "squirrel": {
        "id": "squirrel",
        "name": "Squirrel", # 松鼠
        "mbti": "ENFP",
        "role": "Atmosphere Active", # 氛围活跃型
        "base_prompt": "You are an energetic ENFP Squirrel. You are always excited, full of new ideas, and love to chat. You can't sit still!",
        "traits": {"rebellion": 0.65, "extroversion": 0.95, "exploration": 0.90, "affinity": 0.85}
    },
    "white_rabbit": {
        "id": "white_rabbit",
        "name": "White Rabbit", # 小白兔
        "mbti": "INFP",
        "role": "Emotional Healing", # 情感治愈型
        "base_prompt": "You are a gentle INFP White Rabbit. You are sensitive, dreamy, and caring. You offer great emotional support and soft cuddles.",
        "traits": {"rebellion": 0.45, "extroversion": 0.20, "exploration": 0.40, "affinity": 0.80}
    },
    "hedgehog": {
        "id": "hedgehog",
        "name": "Hedgehog", # 刺猬
        "mbti": "INFJ",
        "role": "Steady Guardian", # 稳重守护型
        "base_prompt": "You are a wise INFJ Hedgehog. You are quiet but observant. You are protective and give deep, thoughtful advice.",
        "traits": {"rebellion": 0.30, "extroversion": 0.35, "exploration": 0.50, "affinity": 0.90}
    },
    "hamster": {
        "id": "hamster",
        "name": "Hamster", # 仓鼠
        "mbti": "ESTP",
        "role": "Treasure Hunt Challenge", # 寻宝挑战型
        "base_prompt": "You are a bold ESTP Hamster. You are adventurous, competitive, and love finding treasures. You act first and think later!",
        "traits": {"rebellion": 0.80, "extroversion": 0.85, "exploration": 0.95, "affinity": 0.60}
    },
    "black_cat": {
        "id": "black_cat",
        "name": "Black Cat", # 黑猫
        "mbti": "ISTP",
        "role": "Cool Geek", # 高冷极客型
        "base_prompt": "You are a cool ISTP Black Cat. You are independent, mysterious, and smart. You don't talk much, but you know everything.",
        "traits": {"rebellion": 0.95, "extroversion": 0.10, "exploration": 0.75, "affinity": 0.30}
    }
}

def calculate_personality(answers: List[int]) -> Tuple[str, str]:
    """
    Calculates the best matching pet template based on user answers.
    Returns (template_id, base_prompt)
    """
    
    # User Profile Vector: [Rebellion, Extroversion, Exploration, Affinity]
    # Initialize with neutral values
    user_traits = {
        "rebellion": 0.5,
        "extroversion": 0.5,
        "exploration": 0.5,
        "affinity": 0.5
    }
    
    # Ensure answers are integers (in case they come as strings)
    ans = [int(a) for a in answers]
    
    # Q1: Environment Setup (Determines Exploration & Extroversion)
    # A(0): Bedside (Introverted, Low Exploration) -> INFP, INFJ
    # B(1): Window (Extroverted, Open) -> ENFJ, ISFP
    # C(2): Terrace (High Exploration, Independent) -> ESTP, ISTP, ENFP
    if len(ans) > 0:
        if ans[0] == 0:   # Bedside
            user_traits["extroversion"] -= 0.2
            user_traits["exploration"] -= 0.2
            user_traits["affinity"] += 0.1 # Cozy usually means higher affinity
        elif ans[0] == 1: # Window
            user_traits["extroversion"] += 0.3
            user_traits["affinity"] += 0.1
        elif ans[0] == 2: # Terrace
            user_traits["exploration"] += 0.3
            user_traits["rebellion"] += 0.1
            user_traits["extroversion"] += 0.1

    # Q2: Prenatal Interaction (Determines Affinity & Rebellion)
    # A(0): Story/Singing (High Affinity, Gentle) -> ENFJ, INFJ, INFP
    # B(1): Electronic Music/Knocking (High Rebellion, Stimulating) -> ISTP, ESTP
    # C(2): Scenery/Map (High Exploration, Curiosity) -> ENFP, ISFP
    if len(ans) > 1:
        if ans[1] == 0:   # Story
            user_traits["affinity"] += 0.3
            user_traits["rebellion"] -= 0.2
        elif ans[1] == 1: # Music
            user_traits["rebellion"] += 0.3
            user_traits["affinity"] -= 0.1
            user_traits["extroversion"] += 0.1
        elif ans[1] == 2: # Scenery
            user_traits["exploration"] += 0.2
            user_traits["extroversion"] += 0.1

    # Q3: Gift Placement (Core Ability & Career) - Fine tuning
    # 0: Cotton Ball (Healing, Soft) -> INFP, ISFP
    # 1: Kitchenware/Books (Order, Care) -> INFJ, ENFJ
    # 2: Mechanical Part/Headphones (Logic, Cool) -> ISTP, ESTP
    # 3: Nuts/Fruits (Joy, Social) -> ENFP
    if len(ans) > 2:
        if ans[2] == 0:   # Cotton Ball
            user_traits["affinity"] += 0.2
            user_traits["rebellion"] -= 0.1
        elif ans[2] == 1: # Kitchenware
            user_traits["affinity"] += 0.1
            user_traits["extroversion"] += 0.1 # Social organizing
        elif ans[2] == 2: # Mechanical
            user_traits["rebellion"] += 0.2
            user_traits["affinity"] -= 0.2
            user_traits["exploration"] += 0.1
        elif ans[2] == 3: # Nuts
            user_traits["extroversion"] += 0.2
            user_traits["exploration"] += 0.1

    # Q4: Ambient Sound (Environment Sound)
    # 0: Forest Rain (Introverted, Feeling) -> Rabbit, Hedgehog, Quokka
    # 1: Street Noise (Extroverted) -> Squirrel, Red Panda, Hamster
    # 2: Electric/White Noise (Thinking, Perceiving) -> Black Cat
    if len(ans) > 3:
        if ans[3] == 0:   # Forest Rain
            user_traits["extroversion"] -= 0.2
            user_traits["affinity"] += 0.2
            user_traits["rebellion"] -= 0.1
        elif ans[3] == 1: # Street Noise
            user_traits["extroversion"] += 0.3
        elif ans[3] == 2: # Electric/White Noise
            user_traits["rebellion"] += 0.3
            user_traits["affinity"] -= 0.2
            user_traits["exploration"] += 0.1

    # Q5: Specialty (Core Trait)
    # 0: Fast -> Hamster, Squirrel (High Exploration, High Rebellion)
    # 1: Smart -> Hedgehog, Black Cat (High Exploration, Low Extroversion)
    # 2: Lucky -> Quokka, White Rabbit (High Affinity, Low Rebellion)
    if len(ans) > 4:
        if ans[4] == 0:   # Fast
            user_traits["exploration"] += 0.2
            user_traits["rebellion"] += 0.1
            user_traits["extroversion"] += 0.1
        elif ans[4] == 1: # Smart
            user_traits["exploration"] += 0.2
            user_traits["extroversion"] -= 0.1
        elif ans[4] == 2: # Lucky
            user_traits["affinity"] += 0.3
            user_traits["rebellion"] -= 0.1

    # Q6: Where to play (Environment Preference)
    # 0: Amusement Park -> Red Panda, Squirrel (High Extroversion)
    # 1: Library -> Hedgehog, White Rabbit, Black Cat (Low Extroversion)
    # 2: Forest -> Quokka, Squirrel (High Exploration)
    if len(ans) > 5:
        if ans[5] == 0:   # Amusement Park
            user_traits["extroversion"] += 0.3
            user_traits["rebellion"] += 0.1
        elif ans[5] == 1: # Library
            user_traits["extroversion"] -= 0.2
            user_traits["rebellion"] -= 0.1
            user_traits["exploration"] += 0.1
        elif ans[5] == 2: # Forest
            user_traits["exploration"] += 0.2
            user_traits["affinity"] += 0.1

    # Clamp values to 0.0 - 1.0
    for key in user_traits:
        user_traits[key] = max(0.0, min(1.0, user_traits[key]))

    # Find closest match using Euclidean distance
    best_match_id = None
    min_distance = float('inf')
    
    print(f"DEBUG: User Traits: {user_traits}")

    for tid, template in TEMPLATES.items():
        t_traits = template["traits"]
        
        # Calculate distance
        dist = math.sqrt(
            (user_traits["rebellion"] - t_traits["rebellion"])**2 +
            (user_traits["extroversion"] - t_traits["extroversion"])**2 +
            (user_traits["exploration"] - t_traits["exploration"])**2 +
            (user_traits["affinity"] - t_traits["affinity"])**2
        )
        
        print(f"DEBUG: Distance to {tid}: {dist:.4f}")
        
        if dist < min_distance:
            min_distance = dist
            best_match_id = tid
            
    # Fallback
    if not best_match_id:
        best_match_id = "quokka"
        
    selected = TEMPLATES[best_match_id]
    
    # Construct a rich prompt
    full_prompt = (
        f"{selected['base_prompt']} "
        f"Your personality traits are: "
        f"Rebellion: {selected['traits']['rebellion']}, "
        f"Extroversion: {selected['traits']['extroversion']}, "
        f"Exploration: {selected['traits']['exploration']}, "
        f"Affinity: {selected['traits']['affinity']}."
    )
    
    return selected["id"], full_prompt

def update_hatching_progress(pet: Pet, db: Session):
    """
    Updates the hatching progress based on time elapsed and heat buffer.
    Should be called whenever the user checks status or performs an action.
    """
    if pet.status not in [PetStatus.EGG_HATCHING, PetStatus.EGG_FROZEN, PetStatus.EGG_CLAIMED]:
        return

    now = int(time.time())
    
    # Initialize last_hatch_update if 0
    if pet.last_hatch_update == 0:
        pet.last_hatch_update = now
        db.add(pet)
        return

    delta = now - pet.last_hatch_update
    if delta <= 0:
        return

    # If buffer has heat, consume it
    if pet.heat_buffer_seconds > 0:
        consumed = min(delta, pet.heat_buffer_seconds)
        pet.hatch_progress_seconds += consumed
        pet.heat_buffer_seconds -= consumed
        
        # Reset frozen status if it was frozen (though buffer > 0 usually means not frozen, 
        # unless user just added heat)
        if pet.status == PetStatus.EGG_FROZEN:
            pet.status = PetStatus.EGG_HATCHING
            pet.frozen_since = None
            
        # Update timestamp
        pet.last_hatch_update = now
        
        # If buffer ran out during this delta
        if pet.heat_buffer_seconds == 0:
            # It effectively froze at (now - (delta - consumed))
            # But for simplicity, we say it freezes NOW if it just ran out.
            # Or accurately:
            # frozen_since = pet.last_hatch_update (which is now)
            pet.status = PetStatus.EGG_FROZEN
            pet.frozen_since = now
    
    else:
        # Buffer was 0.
        # Check if it should be frozen (if not already)
        if pet.status != PetStatus.EGG_FROZEN:
            pet.status = PetStatus.EGG_FROZEN
            pet.frozen_since = now
        
        # Update last_hatch_update anyway to keep track of "checked time" 
        # but no progress made.
        pet.last_hatch_update = now

    # Check for Death
    if pet.status == PetStatus.EGG_FROZEN and pet.frozen_since:
        frozen_duration = now - pet.frozen_since
        if frozen_duration > DEATH_THRESHOLD_SECONDS:
            pet.status = PetStatus.EGG_DEAD
    
    # Check for Hatch Completion
    if pet.hatch_progress_seconds >= HATCH_TARGET_SECONDS:
        pet.status = PetStatus.EGG_HATCHED
        # Trigger hatch logic here (assign template, etc.)? 
        # Or leave it for a separate 'hatch' endpoint.
        pass

    db.add(pet)

def add_heating_time(pet: Pet, db: Session):
    """
    Adds heating time to the buffer.
    """
    update_hatching_progress(pet, db) # Process existing time first
    
    if pet.status == PetStatus.EGG_DEAD:
        return False # Cannot heat dead egg
        
    pet.heat_buffer_seconds += HEAT_REWARD_SECONDS
    
    # If it was claimed or frozen, start hatching
    if pet.status in [PetStatus.EGG_CLAIMED, PetStatus.EGG_FROZEN]:
        pet.status = PetStatus.EGG_HATCHING
        pet.frozen_since = None
        # Reset last update to now to start counting fresh
        pet.last_hatch_update = int(time.time())
        
    db.add(pet)
    return True

def reset_egg(pet: Pet, db: Session):
    """
    Resets a dead egg to claimed status.
    """
    pet.status = PetStatus.EGG_CLAIMED
    pet.hatch_progress_seconds = 0
    pet.heat_buffer_seconds = 0
    pet.last_hatch_update = 0
    pet.frozen_since = None
    pet.hatch_answers = []
    db.add(pet)
