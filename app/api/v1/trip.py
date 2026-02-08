from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.pet import Pet, PetStatus
from app.models.diary import Diary
from app.schemas.trip_schema import TripCreate, TripResponse, DiaryEntry
from app.services.game_engine.probability import roll_trip_outcome
from app.services.game_engine.narrator import generate_diary_entry
from app.services.image_gen_service import ImageGenerationService
from app.api.deps import get_current_user_id
import asyncio
import random
import os

router = APIRouter()

# In-memory store REMOVED in favor of DB status
# ACTIVE_TRIPS = {} 

# ...

# Correct implementation of background task logic
def run_trip_logic(pet_id: int):
    """
    Synchronous wrapper to be run in background thread or just logic called by async wrapper
    """
    print(f"DEBUG: run_trip_logic called for pet {pet_id}", flush=True)
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        pet = db.query(Pet).filter(Pet.id == pet_id).first()
        if not pet:
            print(f"DEBUG: Pet {pet_id} not found in background task", flush=True)
            return

        print(f"DEBUG: Pet {pet.name} found. Rolling outcome...", flush=True)
        # 1. Roll Outcome
        trip_data = roll_trip_outcome(pet.dynamic_traits)
        print(f"DEBUG: Trip outcome rolled: {trip_data}", flush=True)
        
        # 2. Generate Diary
        print(f"DEBUG: Generating diary entry...", flush=True)
        diary_content = generate_diary_entry(pet, trip_data)
        print(f"DEBUG: Diary generated: {diary_content[:50]}...", flush=True)
        
        # 2.5 Generate Image
        image_url = None
        try:
            print("DEBUG: Generating travel photo...", flush=True)
            img_service = ImageGenerationService()
            
            # Construct absolute paths
            # Note: We are running in /data/ext_workspace/taoziyang_ext, so we can use absolute path
            base_path = "/data/ext_workspace/taoziyang_ext/linkpet-mvp/frontend/public/images"
            pet_image_path = os.path.join(base_path, "pets", f"{pet.template_id}.png")
            scene_image_path = os.path.join(base_path, "scenes", f"{trip_data['scene']['id']}.png")
            
            # Fallback if specific scene image missing
            if not os.path.exists(scene_image_path):
                 print(f"WARNING: Scene image not found at {scene_image_path}, using park.png")
                 scene_image_path = os.path.join(base_path, "scenes", "park.png")
            
            if os.path.exists(pet_image_path) and os.path.exists(scene_image_path):
                image_url = img_service.generate_travel_photo(
                    pet_image_url=pet_image_path,
                    scene_image_url=scene_image_path,
                    pet_description=f"A happy {pet.template_id}",
                    scene_name=trip_data['scene']['name'],
                    diary_content=diary_content
                )
                print(f"DEBUG: Image generated: {image_url}", flush=True)
            else:
                print(f"WARNING: Missing image files. Pet: {pet_image_path}, Scene: {scene_image_path}")
                # Fallback to static scene image
                image_url = "/images/scenes/park.png"

        except Exception as img_err:
            print(f"ERROR generating image: {img_err}", flush=True)
            import traceback
            traceback.print_exc()
            # Fallback to static scene image
            if "scene_image_path" in locals() and "/frontend/public/" in scene_image_path:
                 image_url = scene_image_path.split("/frontend/public")[-1]
            else:
                 image_url = "/images/scenes/park.png"

        # 3. Save Diary
        new_diary = Diary(
            pet_id=pet.id,
            title=f"Trip to {trip_data['scene']['name']}",
            content=diary_content,
            image_url=image_url
        )
        db.add(new_diary)
        
        # 4. Update Pet Stats and Status
        pet.status = PetStatus.SLEEPING.value
        db.add(pet) # Mark pet as updated
        
        db.commit()
        print(f"Trip finished for pet {pet.id}. Diary created. Status set to SLEEPING.", flush=True)
        
    except Exception as e:
        print(f"ERROR inside run_trip_logic: {e}", flush=True)
        # If error, try to reset status to SLEEPING so pet isn't stuck
        try:
            pet.status = PetStatus.SLEEPING.value
            db.commit()
        except:
            pass
        import traceback
        traceback.print_exc()
    finally:
        db.close()

@router.post("/start", response_model=TripResponse)
async def start_trip(
    trip_in: TripCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    pet = db.query(Pet).filter(Pet.id == trip_in.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
        
    # Verify ownership
    if pet.owner_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this pet")
    
    if pet.status == PetStatus.TRAVELING.value:
        raise HTTPException(status_code=400, detail="Pet is already on a trip!")
    
    # For MVP demo, reduce duration to 5-10 seconds instead of minutes
    actual_duration = 5 # seconds
    
    # Set status to TRAVELING
    pet.status = PetStatus.TRAVELING.value
    db.commit()
    
    # Schedule background task
    # Note: simple sleep in background task might block if not async, 
    # but here we want to simulate delay.
    # Using a delayed execution wrapper
    async def delayed_execution(pid: int, delay: int):
        print(f"DEBUG: Background task started for pet {pid}, waiting {delay}s", flush=True)
        await asyncio.sleep(delay)
        print(f"DEBUG: Running trip logic for pet {pid}", flush=True)
        try:
            run_trip_logic(pid)
        except Exception as e:
            print(f"ERROR: run_trip_logic failed: {e}", flush=True)

    background_tasks.add_task(delayed_execution, pet.id, actual_duration)
    
    return {
        "status": "started", 
        "message": f"{pet.name} has left for a trip!",
        "eta_seconds": actual_duration
    }

@router.get("/diaries", response_model=List[DiaryEntry])
def get_diaries(
    pet_id: int, 
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    # Verify pet exists and belongs to user
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
        
    if pet.owner_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this pet's diaries")
        
    diaries = db.query(Diary).filter(Diary.pet_id == pet_id).order_by(Diary.created_at.desc()).all()
    return diaries
