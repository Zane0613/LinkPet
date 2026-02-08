from apscheduler.schedulers.background import BackgroundScheduler
from app.core.database import SessionLocal
from app.models.pet import Pet
from app.services.game_engine.behavior import update_pet_behavior
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def update_all_pets_behavior():
    """
    Background task to update behavior for all pets.
    This ensures pets change status even if no user is logged in.
    """
    db = SessionLocal()
    try:
        pets = db.query(Pet).all()
        logger.info(f"Running background behavior update for {len(pets)} pets...")
        
        for pet in pets:
            try:
                update_pet_behavior(pet, db)
            except Exception as e:
                logger.error(f"Error updating pet {pet.id}: {e}")
                
        db.commit()
    except Exception as e:
        logger.error(f"Scheduler Error: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        # Run every 1 minute
        scheduler.add_job(update_all_pets_behavior, 'interval', minutes=1)
        scheduler.start()
        logger.info("Background scheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped.")
