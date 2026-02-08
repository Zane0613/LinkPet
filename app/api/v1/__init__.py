from fastapi import APIRouter
from app.api.v1 import auth, pet, chat, trip

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(pet.router, prefix="/pet", tags=["pets"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(trip.router, prefix="/trips", tags=["trips"])
