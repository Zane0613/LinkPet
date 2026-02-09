from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import List
import time

from app.core.database import get_db
from app.models.pet import Pet, PetStatus
from app.models.user import User
from app.schemas.pet_schema import PetCreate, PetOut, PetClaim, UserNicknameUpdate, HeatRequest, PetNameUpdate, PetReadDiaryUpdate
from app.services.game_engine.hatching import calculate_personality, update_hatching_progress, add_heating_time, reset_egg
from app.services.game_engine.behavior import update_pet_behavior, select_destination, LANDMARKS
from app.api.deps import get_current_user_id

router = APIRouter()

@router.post("/claim", response_model=PetOut)
def claim_egg(
    pet_in: PetClaim,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    # Check if user already has a pet/egg
    existing_pet = db.query(Pet).filter(Pet.owner_id == current_user_id).first()
    if existing_pet:
        if existing_pet.status == PetStatus.EGG_DEAD:
            # Allow reset/re-claim if dead
            reset_egg(existing_pet, db)
            db.commit()
            db.refresh(existing_pet)
            return existing_pet
        else:
            # Return existing pet
            return existing_pet
            
    # Create new Egg
    db_pet = Pet(
        name="Pet Egg", # Default name
        owner_id=current_user_id,
        template_id="unknown",
        personality_prompt="An unhatched egg.",
        dynamic_traits={},
        status=PetStatus.EGG_CLAIMED.value,
        hatch_answers=[]
    )
    
    db.add(db_pet)
    db.commit()
    db.refresh(db_pet)
    
    return db_pet

@router.post("/nickname", response_model=UserNicknameUpdate)
def set_nickname(
    nickname_in: UserNicknameUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.nickname = nickname_in.nickname
    db.commit()
    return {"nickname": user.nickname}

@router.post("/heat", response_model=PetOut)
def add_heat(
    heat_in: HeatRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    pet = db.query(Pet).filter(Pet.owner_id == current_user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
        
    # Add answer to pet's list
    if not pet.hatch_answers:
        pet.hatch_answers = []
    
    # Check if this question was already answered? 
    # For now, just append. Frontend limits logic.
    # Convert list to mutable
    current_answers = list(pet.hatch_answers)
    current_answers.append(heat_in.answer_index)
    pet.hatch_answers = current_answers
    
    # Add heat
    success = add_heating_time(pet, db)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot heat dead egg")
        
    # Check if hatched
    if pet.status == PetStatus.EGG_HATCHED and (not pet.template_id or pet.template_id == "unknown"):
        # Finalize hatch - calculate personality
        template_id, prompt = calculate_personality(pet.hatch_answers)
        pet.template_id = template_id
        pet.personality_prompt = prompt
        pet.name = f"{template_id.replace('_', ' ').title()}" # Temporary name
        # Do not transition to SLEEPING yet, let user name it first
        db.add(pet)
    
    db.commit()
    db.refresh(pet)
    return pet

@router.post("/name", response_model=PetOut)
def set_pet_name(
    name_in: PetNameUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    pet = db.query(Pet).filter(Pet.owner_id == current_user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
        
    pet.name = name_in.name
    
    # If pet is still in EGG_HATCHED state, move it to TRAVELING immediately
    if pet.status == PetStatus.EGG_HATCHED.value:
        pet.status = PetStatus.TRAVELING.value
        destination = select_destination(pet)
        pet.current_destination = destination
        
        # If it's a landmark, mark as visited
        if destination in LANDMARKS:
            visited = list(pet.visited_landmarks or [])
            if destination not in visited:
                visited.append(destination)
                pet.visited_landmarks = visited
                flag_modified(pet, "visited_landmarks")

        pet.last_status_update = int(time.time())
        
    db.commit()
    db.refresh(pet)
    return pet

@router.post("/read_diary", response_model=PetOut)
def update_read_diary(
    read_in: PetReadDiaryUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    pet = db.query(Pet).filter(Pet.owner_id == current_user_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Only update if new ID is greater than current
    if read_in.last_read_diary_id > pet.last_read_diary_id:
        pet.last_read_diary_id = read_in.last_read_diary_id
        db.commit()
        db.refresh(pet)
        
    return pet

@router.put("/{pet_id}/status", response_model=PetOut)
def update_pet_status(
    pet_id: int, 
    status: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
        
    if pet.owner_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if status not in [s.value for s in PetStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    pet.status = status
    db.commit()
    db.refresh(pet)
    return pet

@router.get("/{pet_id}", response_model=PetOut)
def get_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Update status based on type
    if "egg" in pet.status:
        update_hatching_progress(pet, db)
        
        # If hatched but no template, calculate personality
        if pet.status == PetStatus.EGG_HATCHED.value and (not pet.template_id or pet.template_id == "unknown"):
            template_id, prompt = calculate_personality(pet.hatch_answers)
            pet.template_id = template_id
            pet.personality_prompt = prompt
            pet.name = f"{template_id.replace('_', ' ').title()}"
            db.add(pet)
            
        db.commit()
    else:
        update_pet_behavior(pet, db)
    
    db.refresh(pet)
    return pet

@router.get("/my/all", response_model=List[PetOut])
def get_my_pets(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    pets = db.query(Pet).filter(Pet.owner_id == current_user_id).all()
    
    # Trigger autonomous behavior check for each pet
    for pet in pets:
        if "egg" in pet.status:
            update_hatching_progress(pet, db)
            
            # If hatched but no template, calculate personality
            if pet.status == PetStatus.EGG_HATCHED.value and (not pet.template_id or pet.template_id == "unknown"):
                template_id, prompt = calculate_personality(pet.hatch_answers)
                pet.template_id = template_id
                pet.personality_prompt = prompt
                pet.name = f"{template_id.replace('_', ' ').title()}"
                db.add(pet)
        else:
            update_pet_behavior(pet, db)
            
    db.commit() # Commit any updates
    
    # Refresh logic might be needed but for list it's tricky.
    # We assume db.commit() syncs the objects attached to session.
    return pets
