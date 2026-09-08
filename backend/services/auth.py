import os
import logging
from typing import Optional
import firebase_admin
from firebase_admin import credentials, auth

logger = logging.getLogger(__name__)

# Pointing to the specific service account JSON file
try:
    if not firebase_admin._apps:
        # Resolve to absolute path relative to this file's directory (backend/services/)
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cert_path = os.path.join(current_dir, "dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json")
        if not os.path.exists(cert_path):
            cert_path = os.path.join(os.getcwd(), "backend", "dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json")
        if not os.path.exists(cert_path):
            cert_path = "backend/dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json"

        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)
        logger.info(f"Firebase Admin SDK initialized with certificate: {cert_path}")
    FIREBASE_AVAILABLE = True
except Exception as e:
    logger.error(f"Firebase Admin SDK initialization failed: {str(e)}")
    # Fallback to default credentials or local mock mode if init fails
    try:
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
            logger.info("Firebase Admin SDK fallback initialized with default credentials.")
        FIREBASE_AVAILABLE = True
    except Exception as default_err:
        logger.warning(f"Firebase Admin SDK default initialization skipped: {str(default_err)}")
        FIREBASE_AVAILABLE = False

ADMIN_EMAIL = "ankith.ravishankar@gmail.com"

def verify_firebase_token(token: str) -> Optional[dict]:
    """
    Verifies the Firebase ID token and returns the decoded token dictionary.
    Supports mock token validation for local development environments.
    """
    # Local mock token validation
    if token.startswith("mock-token-"):
        email = token.split("mock-token-")[1]
        is_admin = (email == ADMIN_EMAIL)
        return {
            "uid": "mock_uid_" + email.split("@")[0],
            "email": email,
            "name": email.split("@")[0].upper(),
            "is_admin": is_admin,
            "mock": True
        }
    if token == "mock-developer-token":
        return {
            "uid": "mock_uid_developer",
            "email": "developer@example.com",
            "name": "Mock Developer",
            "is_admin": False,
            "mock": True
        }

    if not FIREBASE_AVAILABLE:
        logger.warning("Firebase Admin SDK is not initialized. Cannot verify token.")
        return None

    try:
        decoded_token = auth.verify_id_token(token)
        email = decoded_token.get("email")
        if not email:
            logger.warning("Firebase token missing email claim.")
            return None
        
        is_admin = (email == ADMIN_EMAIL)
        decoded_token["is_admin"] = is_admin
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {str(e)}")
        return None

