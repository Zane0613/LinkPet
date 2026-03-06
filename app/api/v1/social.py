from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user_id
from app.models.social import UserChat, UserMessage
from app.models.user import User
from app.schemas.social_schema import UserChatResponse, MessageCreate, MessageResponse

router = APIRouter()

@router.get("/chats", response_model=List[UserChatResponse])
def get_user_chats(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    chats = db.query(UserChat).filter(
        and_(
            or_(UserChat.user_id_1 == current_user_id, UserChat.user_id_2 == current_user_id),
            UserChat.is_active == True
        )
    ).all()
    
    result = []
    for chat in chats:
        other_user_id = chat.user_id_2 if chat.user_id_1 == current_user_id else chat.user_id_1
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Manual construction to include extra fields
        chat_resp = UserChatResponse(
            id=chat.id,
            user_id_1=chat.user_id_1,
            user_id_2=chat.user_id_2,
            is_active=chat.is_active,
            created_at=chat.created_at,
            other_user_name=other_user.full_name if other_user else "Unknown User",
            other_user_email=other_user.email if other_user else ""
        )
        result.append(chat_resp)
        
    return result

@router.get("/chats/{chat_id}/messages", response_model=List[MessageResponse])
def get_chat_messages(
    chat_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    # Verify user is part of chat
    chat = db.query(UserChat).filter(UserChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    if chat.user_id_1 != current_user_id and chat.user_id_2 != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")
        
    messages = db.query(UserMessage).filter(UserMessage.chat_id == chat_id)\
        .order_by(UserMessage.created_at.asc())\
        .offset(skip).limit(limit).all()
        
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        
        msg_resp = MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            sender_id=msg.sender_id,
            content=msg.content,
            created_at=msg.created_at,
            sender_name=sender.full_name if sender else "Unknown"
        )
        result.append(msg_resp)
        
    return result

@router.post("/chats/{chat_id}/messages", response_model=MessageResponse)
def send_message(
    chat_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    # Verify user is part of chat
    chat = db.query(UserChat).filter(UserChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    if chat.user_id_1 != current_user_id and chat.user_id_2 != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to send message to this chat")
    
    if not chat.is_active:
         raise HTTPException(status_code=400, detail="Chat is not active")

    new_msg = UserMessage(
        chat_id=chat_id,
        sender_id=current_user_id,
        content=message.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    sender = db.query(User).filter(User.id == current_user_id).first()
    
    msg_resp = MessageResponse(
        id=new_msg.id,
        chat_id=new_msg.chat_id,
        sender_id=new_msg.sender_id,
        content=new_msg.content,
        created_at=new_msg.created_at,
        sender_name=sender.full_name if sender else "Unknown"
    )
        
    return msg_resp
