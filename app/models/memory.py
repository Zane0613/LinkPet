from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
# from pgvector.sqlalchemy import Vector # Disable for SQLite MVP
from app.core.database import Base
import datetime

class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"))
    content = Column(String)
    # Store embedding as JSON list instead of Vector type for SQLite compatibility
    embedding = Column(JSON) 
    type = Column(String) # user_chat | trip_log
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    pet = relationship("Pet")
