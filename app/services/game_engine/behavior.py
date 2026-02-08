import random
import time
import numpy as np
from app.models.pet import Pet, PetStatus
from app.models.diary import Diary
from app.models.memory import Memory
from app.services.llm_service import llm_service
from app.services.image_gen_service import image_gen_service
from sqlalchemy.orm import Session
import os
import datetime

# Configuration
MIN_DURATION_SECONDS = 60 * 180  # Minimum time to stay in a state
PROBABILITY_CHECK_INTERVAL = 10 

# Destinations
SCENES = ["Park", "Bar", "Library", "Concert"]
LANDMARKS = ["Volcano Eruption", "Statue"]

# 📍 场景图片配置 (SCENE_IMAGES)
# ---------------------------------------------------------
# 1. 本地存放位置: frontend/public/images/scenes/
# 2. 配置说明: 这里配置的是【本地绝对路径】，后端服务会直接读取文件内容转为 Base64 发送给 AI。
# ---------------------------------------------------------

# Base paths
BASE_DIR = "/data/ext_workspace/taoziyang_ext/linkpet-mvp"
SCENES_DIR = os.path.join(BASE_DIR, "frontend/public/images/scenes")
PETS_DIR = os.path.join(BASE_DIR, "frontend/public/images/pets")

SCENE_IMAGES = {
    "Park": os.path.join(SCENES_DIR, "park.png"),
    "Bar": os.path.join(SCENES_DIR, "bar.png"),
    "Library": os.path.join(SCENES_DIR, "library.png"),
    "Concert": os.path.join(SCENES_DIR, "concert.png"),
    "Volcano Eruption": os.path.join(SCENES_DIR, "volcano_eruption.png"),
    "Statue": os.path.join(SCENES_DIR, "statue.png"),
}

# Pet images (Local paths)
PET_TEMPLATE_IMAGES = {
    "hamster": os.path.join(PETS_DIR, "hamster.png"),
    "hedgehog": os.path.join(PETS_DIR, "hedgehog.png"),
    "white_rabbit": os.path.join(PETS_DIR, "white_rabbit.png"),
    "black_cat": os.path.join(PETS_DIR, "black_cat.png"),
    "quokka": os.path.join(PETS_DIR, "quokka.png"),
    "red_panda": os.path.join(PETS_DIR, "red_panda.png"),
    "squirrel": os.path.join(PETS_DIR, "squirrel.png"),
}

def get_personality_modifiers(pet: Pet):
    """
    Derive probability modifiers from pet's personality traits.
    Traits are 0.0 to 1.0.
    """
    traits = pet.dynamic_traits or {}
    
    # Defaults
    exploration = traits.get("exploration", 0.5)
    extroversion = traits.get("extroversion", 0.5)
    
    # High exploration -> Higher chance to travel
    travel_weight = 0.1 + (exploration * 0.4) # 0.1 to 0.5
    
    # High extroversion -> Higher chance to eat (social?) or just active
    eat_weight = 0.2 + (extroversion * 0.2) # 0.2 to 0.4
    
    # Sleep is the default/fallback
    sleep_weight = 0.5
    
    return {
        "travel": travel_weight,
        "eat": eat_weight,
        "sleep": sleep_weight
    }

def select_destination(pet: Pet):
    """
    Selects a destination for the pet.
    Prioritizes unvisited landmarks.
    """
    visited = set(pet.visited_landmarks or [])
    unvisited_landmarks = [l for l in LANDMARKS if l not in visited]
    
    # High probability to visit unvisited landmark
    if unvisited_landmarks and random.random() < 0.8:
        return random.choice(unvisited_landmarks)
    
    # Otherwise pick a random scene or already visited landmark (lower chance)
    all_places = SCENES + LANDMARKS
    return random.choice(all_places)

import math

# Personality Trait Mapping
PERSONALITY_TRAIT_MAP = {
    "rebellion": [
        (0.25, "乖巧听话"),
        (0.50, "循规蹈矩"),
        (0.75, "有点小任性"),
        (1.01, "极其叛逆，我行我素")
    ],
    "extroversion": [
        (0.25, "社恐，喜欢独处"),
        (0.50, "内向，慢热"),
        (0.75, "开朗，合群"),
        (1.01, "社交恐怖分子，人来疯")
    ],
    "exploration": [
        (0.25, "恋家，不喜欢变动"),
        (0.50, "谨慎，只去熟悉的地方"),
        (0.75, "好奇，喜欢新鲜事物"),
        (1.01, "冒险家，渴望远方")
    ],
    "affinity": [
        (0.25, "高冷，难以接近"),
        (0.50, "独立，保持距离"),
        (0.75, "友善，容易相处"),
        (1.01, "粘人，超级暖男/暖女")
    ]
}

def get_trait_description(trait: str, value: float) -> str:
    """Returns the text description for a specific trait value."""
    if trait not in PERSONALITY_TRAIT_MAP:
        return ""
    
    for threshold, desc in PERSONALITY_TRAIT_MAP[trait]:
        if value < threshold:
            return desc
    return PERSONALITY_TRAIT_MAP[trait][-1][1]

def get_detailed_personality_description(pet: Pet) -> str:
    """Returns a detailed personality description string for LLM."""
    traits = pet.dynamic_traits or {}
    descriptions = []
    
    # Define trait keys to look for
    trait_keys = ["rebellion", "extroversion", "exploration", "affinity"]
    
    for key in trait_keys:
        val = traits.get(key, 0.5)
        desc = get_trait_description(key, val)
        descriptions.append(desc)
        
    return "，".join(descriptions)

def calculate_encounter_probability(pet1: Pet, pet2: Pet) -> float:
    """
    Calculates the probability of an encounter between two pets based on personality traits.
    Higher probability for very similar OR very different personalities.
    """
    traits1 = pet1.dynamic_traits or {}
    traits2 = pet2.dynamic_traits or {}
    
    # Extract traits (default to 0.5)
    p1_expl = traits1.get("exploration", 0.5)
    p1_extr = traits1.get("extroversion", 0.5)
    
    p2_expl = traits2.get("exploration", 0.5)
    p2_extr = traits2.get("extroversion", 0.5)
    
    # Calculate Euclidean distance between personality vectors
    distance = math.sqrt((p1_expl - p2_expl)**2 + (p1_extr - p2_extr)**2)
    # Max possible distance is sqrt(1^2 + 1^2) = sqrt(2) ≈ 1.414
    
    # Base probability
    base_prob = 0.3
    
    # Similarity Bonus (Low distance)
    # If distance is < 0.2, add up to 0.4
    similarity_bonus = max(0, (0.3 - distance) * 1.33)
    
    # Contrast Bonus (High distance)
    # If distance is > 0.8, add up to 0.4
    contrast_bonus = max(0, (distance - 0.8) * 0.65)
    
    final_prob = base_prob + similarity_bonus + contrast_bonus
    
    # Cap at 0.9
    return min(0.9, final_prob)

def get_personality_adjectives(pet: Pet) -> str:
    """Returns a string of adjectives based on pet's traits."""
    traits = pet.dynamic_traits or {}
    adjectives = []
    
    expl = traits.get("exploration", 0.5)
    extr = traits.get("extroversion", 0.5)
    
    if expl > 0.7: adjectives.append("adventurous")
    elif expl < 0.3: adjectives.append("cautious")
    
    if extr > 0.7: adjectives.append("outgoing")
    elif extr < 0.3: adjectives.append("shy")
    
    if not adjectives: adjectives.append("calm")
    
    return " ".join(adjectives)

def calculate_cosine_similarity(vec1, vec2):
    """Calculates cosine similarity between two vectors."""
    if not vec1 or not vec2:
        return 0.0
    
    try:
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return float(np.dot(v1, v2) / (norm1 * norm2))
    except Exception:
        return 0.0

def create_diary_entry(owner: Pet, partner, destination: str, db: Session):
    """
    Helper to generate a single diary entry for a specific pet.
    """
    # 1. Prepare Descriptions
    my_adj = get_personality_adjectives(owner)
    my_desc = f"a {my_adj} {owner.template_id}"
    my_personality_desc = get_detailed_personality_description(owner)
    
    encounter_text = ""
    friend_url = None
    friend_desc = None
    
    if partner:
        partner_adj = get_personality_adjectives(partner)
        friend_desc = f"a {partner_adj} {partner.template_id} named {partner.name}"
        partner_personality_desc = get_detailed_personality_description(partner)
        
        encounter_text = f"你在那里偶遇了好朋友{partner.name}（一只{friend_desc}，性格：{partner_personality_desc}）。"
        friend_url = PET_TEMPLATE_IMAGES.get(partner.template_id, PET_TEMPLATE_IMAGES["hamster"])
    
    # 1.5 Retrieve Similar Memories
    retrieved_context = ""
    try:
        query_text = f"Trip to {destination}. {encounter_text}. Personality: {my_personality_desc}"
        query_embedding = llm_service.get_embedding(query_text)
        
        if query_embedding:
            # Fetch all trip logs for this pet
            memories = db.query(Memory).filter(
                Memory.pet_id == owner.id,
                Memory.type == "trip_log"
            ).all()
            
            # Calculate similarities
            scored_memories = []
            for mem in memories:
                if mem.embedding:
                    score = calculate_cosine_similarity(query_embedding, mem.embedding)
                    scored_memories.append((score, mem.content))
            
            # Sort descending
            scored_memories.sort(key=lambda x: x[0], reverse=True)
            
            # Take top 5
            top_memories = scored_memories[:5]
            
            if top_memories:
                retrieved_context = "\n\nRelevant Past Memories (for style/context reference):\n"
                for i, (score, content) in enumerate(top_memories):
                    retrieved_context += f"{i+1}. {content} (Similarity: {score:.2f})\n"
                print(f"Retrieved {len(top_memories)} similar memories for {owner.name}", flush=True)
    except Exception as e:
        print(f"Memory retrieval failed: {e}", flush=True)

    # 2. Build Prompt
    system_prompt = (
        f"You are a {owner.template_id} named {owner.name}. "
        f"Your personality traits are: {my_personality_desc}. "
        f"{owner.personality_prompt} "
        f"You just returned from a trip to the {destination}. "
        f"{encounter_text} "
        f"{retrieved_context}"
        "请用中文写一篇简短可爱的日记（1-2句话），描述你在那里的所见所闻。使用第一人称。"
        "如果有偶遇朋友，请根据双方的性格描述互动细节（比如内向的朋友可能害羞，外向的朋友可能很热情）。"
        "你可以参考过去的记忆，保持语气和风格的一致性，但不要直接复制。"
    )
    
    # 3. Call LLM
    content = llm_service.generate_narrative(system_prompt, f"Describe your trip to the {destination}.")
    
    # 4. Generate Image
    scene_url = SCENE_IMAGES.get(destination, SCENE_IMAGES["Park"])
    pet_url = PET_TEMPLATE_IMAGES.get(owner.template_id, PET_TEMPLATE_IMAGES["hamster"])
    
    # Check if files exist
    if not os.path.exists(scene_url):
         print(f"WARNING: Scene image not found at {scene_url}, using Park default")
         scene_url = SCENE_IMAGES["Park"]
         
    if not os.path.exists(pet_url):
         print(f"WARNING: Pet image not found at {pet_url}, using Hamster default")
         pet_url = PET_TEMPLATE_IMAGES["hamster"]

    image_url = None
    try:
        image_url = image_gen_service.generate_travel_photo(
            pet_image_url=pet_url,
            scene_image_url=scene_url,
            pet_description=my_desc,
            scene_name=destination,
            friend_image_url=friend_url,
            friend_description=friend_desc,
            diary_content=content
        )
    except Exception as e:
        print(f"Image generation failed: {e}", flush=True)
        # Fallback to static scene image if generation fails
        # Convert local path to relative URL for frontend
        # e.g., /data/.../frontend/public/images/scenes/park.png -> /images/scenes/park.png
        if "/frontend/public/" in scene_url:
            image_url = scene_url.split("/frontend/public")[-1]
        else:
             image_url = "/images/scenes/park.png"
    
    # 5. Save Diary
    new_diary = Diary(
        pet_id=owner.id,
        title=f"Trip to {destination}",
        content=content,
        image_url=image_url 
    )
    db.add(new_diary)
    print(f"Diary generated for {owner.name}: {content}", flush=True)

    # 6. Save Memory (Embedding)
    try:
        # Generate embedding for the new content to allow future retrieval
        diary_embedding = llm_service.get_embedding(content)
        if diary_embedding:
            new_memory = Memory(
                pet_id=owner.id,
                content=content,
                embedding=diary_embedding,
                type="trip_log",
                timestamp=datetime.datetime.utcnow()
            )
            db.add(new_memory)
            print(f"Memory saved for {owner.name}", flush=True)
    except Exception as e:
        print(f"Failed to save memory: {e}", flush=True)

def generate_return_diary(pet: Pet, db: Session):
    """
    Generates a diary entry when the pet returns from a trip.
    Includes a generated image of the trip.
    """
    destination = pet.current_destination or "Unknown Place"
    print(f"Generating diary for {pet.name} returning from {destination}...", flush=True)
    
    # Encounter Logic
    potential_friends = db.query(Pet).filter(
        Pet.id != pet.id,
        Pet.current_destination == destination,
        Pet.status == PetStatus.TRAVELING.value
    ).all()
    
    friend = None
    
    if potential_friends:
        random.shuffle(potential_friends)
        for potential_friend in potential_friends:
            prob = calculate_encounter_probability(pet, potential_friend)
            roll = random.random()
            print(f"Checking encounter with {potential_friend.name}: Prob={prob:.2f}, Roll={roll:.2f}", flush=True)
            
            if roll < prob:
                friend = potential_friend
                print(f"Encounter! {pet.name} met {friend.name} at {destination}", flush=True)
                break 
    
    # Generate for Self
    create_diary_entry(pet, friend, destination, db)
    
    # If friend, generate for friend and force return
    if friend:
        print(f"Generating reciprocal diary for friend {friend.name}...", flush=True)
        create_diary_entry(friend, pet, destination, db)
        
        # Force friend to return
        friend.status = PetStatus.SLEEPING.value
        friend.current_destination = None
        friend.last_status_update = int(time.time())
        db.add(friend)

def update_pet_behavior(pet: Pet, db: Session) -> bool:
    """
    Checks if pet state should change based on time and personality.
    Returns True if state changed, False otherwise.
    """
    current_time = int(time.time())
    last_update = pet.last_status_update or 0
    
    # 1. Enforce minimum duration in current state
    if current_time - last_update < MIN_DURATION_SECONDS:
        return False
        
    # 2. Determine Probabilities
    mods = get_personality_modifiers(pet)
    
    # Current State Logic
    current_status = pet.status
    new_status = current_status
    
    # Roll the dice (0.0 to 1.0)
    roll = random.random()
    
    if current_status == PetStatus.SLEEPING.value:
        # Normalize weights for transition
        total_weight = mods["sleep"] + mods["eat"] + mods["travel"]
        p_eat = mods["eat"] / total_weight
        p_travel = mods["travel"] / total_weight
        
        if roll < p_eat:
            new_status = PetStatus.EATING.value
        elif roll < p_eat + p_travel:
            new_status = PetStatus.TRAVELING.value
        else:
            new_status = PetStatus.SLEEPING.value
            
    elif current_status == PetStatus.EATING.value:
        if roll < 0.7: 
            new_status = PetStatus.SLEEPING.value
        elif roll < 0.9: 
            new_status = PetStatus.TRAVELING.value
        else:
            new_status = PetStatus.EATING.value
            
    elif current_status == PetStatus.TRAVELING.value:
        if roll < 0.6: 
            new_status = PetStatus.SLEEPING.value
        elif roll < 0.8: 
            new_status = PetStatus.EATING.value
        else:
            new_status = PetStatus.TRAVELING.value

    # 3. Apply Update if Changed
    if new_status != current_status:
        # Check if returning from Traveling
        if current_status == PetStatus.TRAVELING.value and new_status != PetStatus.TRAVELING.value:
            generate_return_diary(pet, db)
            # Clear current destination
            pet.current_destination = None

        # Check if STARTING to Travel
        if new_status == PetStatus.TRAVELING.value:
            destination = select_destination(pet)
            pet.current_destination = destination
            
            # If it's a landmark, mark as visited
            if destination in LANDMARKS:
                visited = list(pet.visited_landmarks or [])
                if destination not in visited:
                    visited.append(destination)
                    pet.visited_landmarks = visited
            
            print(f"Pet {pet.name} is going to {destination}!", flush=True)

        pet.status = new_status
        pet.last_status_update = current_time
        db.add(pet)
        db.commit()
        db.refresh(pet)
        print(f"Pet {pet.name} changed status from {current_status} to {new_status}", flush=True)
        return True
        
    return False
