from fastapi import Header, HTTPException, Depends, status
from backend.services.auth import verify_firebase_token

async def get_current_user(authorization: str = Header(None)):
    """
    FastAPI dependency that extracts the Bearer token from the Authorization header,
    calls verify_firebase_token, and returns the user dictionary if valid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    token = authorization.split("Bearer ")[1].strip()
    user = verify_firebase_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return user

ADMIN_EMAIL = "ankith.ravishankar@gmail.com"

def require_admin(user: dict = Depends(get_current_user)):
    """
    FastAPI dependency that ensures the authenticated user is an administrator
    by checking their email.
    """
    if user.get("email") != ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access required"
        )
    return user
