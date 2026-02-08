
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.core.database import SQLALCHEMY_DATABASE_URL

# Fix for relative import when running as script
import sys
import os
sys.path.append(os.getcwd())

from app.core.database import engine, SessionLocal

db = SessionLocal()
users = db.query(User).all()
print(f"Total users: {len(users)}")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Name: {u.full_name}, Nickname: {u.nickname}")
db.close()
