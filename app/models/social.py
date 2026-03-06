from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class PetEncounter(Base):
    __tablename__ = "pet_encounters"

    id = Column(Integer, primary_key=True, index=True)
    pet_id_1 = Column(Integer, ForeignKey("pets.id"))
    pet_id_2 = Column(Integer, ForeignKey("pets.id"))
    encounter_count = Column(Integer, default=1)
    last_encounter_date = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pet1 = relationship("Pet", foreign_keys=[pet_id_1])
    pet2 = relationship("Pet", foreign_keys=[pet_id_2])

class UserChat(Base):
    __tablename__ = "user_chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id_1 = Column(Integer, ForeignKey("users.id"))
    user_id_2 = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user1 = relationship("User", foreign_keys=[user_id_1])
    user2 = relationship("User", foreign_keys=[user_id_2])
    messages = relationship("UserMessage", back_populates="chat")

class UserMessage(Base):
    __tablename__ = "user_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("user_chats.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chat = relationship("UserChat", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
