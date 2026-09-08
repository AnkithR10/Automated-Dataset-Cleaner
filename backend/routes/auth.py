import logging
from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from backend.config import settings

# Attempt to initialize firebase-admin for token validation
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    import os
    
    # We check if firebase_admin is already initialized (to avoid multiple app errors)
    if not firebase_admin._apps:
        cert_path = settings.FIREBASE_SERVICE_ACCOUNT_JSON_PATH
        # Try to auto-resolve to the absolute certificate file path if not set or missing
        if not cert_path or not os.path.exists(cert_path):
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            possible_paths = [
                os.path.join(current_dir, "dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json"),
                os.path.join(os.getcwd(), "backend", "dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json"),
                "backend/dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json"
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    cert_path = p
                    break
        
        if cert_path and os.path.exists(cert_path):
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)
            logging.info(f"Firebase Admin SDK initialized in routes/auth.py with certificate: {cert_path}")
        else:
            # Fallback to default credentials or mock mode if credentials file doesn't exist
            logging.warning("Firebase Admin SDK running in default/mock mode because credentials file was not specified.")
            firebase_admin.initialize_app()
    FIREBASE_AVAILABLE = True
except Exception as e:
    logging.warning(f"Firebase Admin SDK initialization skipped: {str(e)}. Running auth routes in local mock mode.")
    FIREBASE_AVAILABLE = False

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserSyncRequest(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

# Dependency to check authorization token
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Dependency that extracts the Bearer token from the Authorization header
    and verifies it using the Firebase Admin SDK.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Must use Bearer token."
        )
    
    token = authorization.split("Bearer ")[1]
    
    if not FIREBASE_AVAILABLE:
        # Mock mode if Firebase is not active
        if token == "mock-developer-token":
            return {
                "uid": "mock_uid_12345",
                "email": "developer@example.com",
                "name": "Mock Developer",
                "mock": True
            }
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Firebase Admin SDK is not initialized. Setup service account JSON to enable token verification."
        )

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )

# Endpoints
@router.get("/me")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Checks the user's current session state. Returns decoded JWT contents.
    This route can be queried by the frontend to confirm backend session sync.
    """
    return {
        "status": "success",
        "user": {
            "uid": current_user.get("uid"),
            "email": current_user.get("email"),
            "name": current_user.get("name"),
            "picture": current_user.get("picture"),
            "auth_provider": current_user.get("firebase", {}).get("sign_in_provider")
        }
    }

@router.post("/sync")
async def sync_user_db(
    payload: UserSyncRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Synchronizes the logged-in Firebase user details with the backend database.
    This is triggered upon successful login on the frontend.
    """
    # Security check: Make sure client-provided UID matches the verified JWT token UID
    if payload.uid != current_user.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User identity mismatch. Token UID does not match request body UID."
        )
    
    # Placeholder: Sync with your local Database (PostgreSQL, MongoDB, etc.) here.
    logging.info(f"Synchronized user {payload.email} (UID: {payload.uid}) in database.")
    
    return {
        "status": "success",
        "message": "User database synchronization complete.",
        "user": payload
    }
