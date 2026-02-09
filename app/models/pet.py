from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Enum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class PetStatus(str, enum.Enum):
    SLEEPING = "sleeping"
    EATING = "eating"
    TRAVELING = "traveling"
    # Egg Statuses
    EGG_CLAIMED = "egg_claimed"
    EGG_HATCHING = "egg_hatching"
    EGG_FROZEN = "egg_frozen"
    EGG_DEAD = "egg_dead"
    EGG_HATCHED = "egg_hatched"

class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    template_id = Column(String)
    personality_prompt = Column(String)
    dynamic_traits = Column(JSON, default={})
    status = Column(String, default=PetStatus.EGG_CLAIMED.value) # Default to claimed egg
    last_status_update = Column(Integer, default=0) # Unix timestamp of last status change
    visited_landmarks = Column(JSON, default=[]) # List of visited landmark names
    current_destination = Column(String, nullable=True) # Current travel destination name
    
    # Hatching related fields
    hatch_progress_seconds = Column(Integer, default=0) # Total seconds heated
    heat_buffer_seconds = Column(Integer, default=0) # Remaining heat fuel in seconds
    last_hatch_update = Column(Integer, default=0) # Timestamp of last heat calculation
    frozen_since = Column(Integer, nullable=True) # Timestamp when buffer hit 0
    hatch_answers = Column(JSON, default=[]) # Store user answers during hatching
    last_read_diary_id = Column(Integer, default=0) # ID of the last diary entry read by user
    is_generating_diary = Column(Boolean, default=False) # Flag to indicate if diary is being generated
    
    owner = relationship("User", backref="pets")
    memories = relationship("Memory", back_populates="pet")
    diaries = relationship("Diary", back_populates="pet")
