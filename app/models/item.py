from sqlalchemy import Column, Integer, String, JSON
from app.core.database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    meta_tags = Column(JSON) # e.g. {"artistic": +5, "outgoing": +2}
