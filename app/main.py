from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.config import settings
from app.api.v1 import api_router
from app.api.v1 import trip
from app.core.database import engine, Base, SessionLocal
# Import models so they are registered with Base
from app.models import user, pet, memory, item 
from app.models.user import User
from app.models.memory import Memory
from app.models.diary import Diary
from app.services.scheduler import start_scheduler, stop_scheduler

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(trip.router, prefix="/api/v1/trip", tags=["trip"])

@app.on_event("startup")
def startup_event():
    # Start Background Scheduler
    start_scheduler()

    # Seed Data
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@linkpet.ai").first()
        if not user:
            print("Seeding demo user...")
            demo_user = User(
                email="demo@linkpet.ai",
                full_name="Demo User",
                hashed_password="fake_hash_password"
            )
            db.add(demo_user)
            db.commit()
            print("Demo user created with ID:", demo_user.id)
    finally:
        db.close()

@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()

# Mount static files (Frontend)
# Must be mounted after API routes to avoid conflicts
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"message": "Welcome to LinkPet API. Static files not found."}
