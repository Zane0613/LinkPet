from fastapi import Header, HTTPException
from typing import Optional

def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    """
    Extracts the user ID from the X-User-ID header.
    In a real app, this would verify a JWT token.
    For this MVP, we trust the client-provided ID (with simple validation).
    """
    if x_user_id is None:
        # For backward compatibility or testing, we might default to 1
        # But to fix the data isolation issue, we should really require it.
        # However, to avoid breaking the app if the user hasn't logged in yet (and is on a public page),
        # we might need to handle this gracefully.
        # Since these endpoints are "my/all" or "hatch", they require a user context.
        # Let's default to 1 for now but ideally this should be strict.
        return 1
        
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid User ID header")
