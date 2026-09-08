import os
import json
import logging

# Configure logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("init_project")

def init_backend():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    logger.info(f"Running self-healing backend initialization at: {backend_dir}")

    # 1. Folders Verification (routes, services, models)
    folders = ["routes", "services", "models"]
    for folder in folders:
        folder_path = os.path.join(backend_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            logger.info(f"Created missing directory: {folder_path}")
        
        # Ensure __init__.py exists for packaging
        init_file = os.path.join(folder_path, "__init__.py")
        if not os.path.exists(init_file):
            with open(init_file, "w", encoding="utf-8") as f:
                f.write("# Package initialization\n")
            logger.info(f"Created __init__.py in: {folder_path}")

    # 2. Files Verification
    # .env check
    env_path = os.path.join(backend_dir, ".env")
    if not os.path.exists(env_path):
        default_env = (
            "# ==============================================================================\n"
            "# BACKEND CONFIGURATION\n"
            "# ==============================================================================\n"
            "PROJECT_NAME=\"FastAPI SaaS Boilerplate\"\n"
            "HOST=\"0.0.0.0\"\n"
            "PORT=8000\n"
            "DEBUG=True\n\n"
            "# Razorpay Credentials\n"
            "RAZORPAY_KEY_ID=\"\"\n"
            "RAZORPAY_KEY_SECRET=\"\"\n\n"
            "# Administrator Access Control\n"
            "ADMIN_EMAIL=\"ankith.ravishankar@gmail.com\"\n\n"
            "# External Exchange Rates API\n"
            "CURRENCY_API_KEY=\"\"\n\n"
            "# Context\n"
            "ENVIRONMENT=\"development\"\n"
        )
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(default_env)
        logger.info(f"Created missing .env file at: {env_path}")
    else:
        logger.info(f".env file verified: {env_path}")

    # requirements.txt check
    req_path = os.path.join(backend_dir, "requirements.txt")
    if not os.path.exists(req_path):
        default_reqs = (
            "fastapi>=0.100.0\n"
            "uvicorn>=0.22.0\n"
            "pandas>=2.0.0\n"
            "python-multipart>=0.0.6\n"
            "firebase-admin>=6.2.0\n"
            "razorpay>=1.3.0\n"
            "python-dotenv>=1.0.0\n"
            "pydantic-settings>=2.0.0\n"
            "httpx>=0.24.0\n"
            "scikit-learn>=1.4.0\n"
        )
        with open(req_path, "w", encoding="utf-8") as f:
            f.write(default_reqs)
        logger.info(f"Created missing requirements.txt at: {req_path}")
    else:
        logger.info(f"requirements.txt verified: {req_path}")

    # Firebase service account JSON verification
    firebase_json_filename = "dream-weaver-x8hpz-firebase-adminsdk-fbsvc-286ef3104b.json"
    firebase_json_path = os.path.join(backend_dir, firebase_json_filename)
    if not os.path.exists(firebase_json_path):
        default_firebase_json = {
            "type": "service_account",
            "project_id": "dream-weaver-x8hpz",
            "private_key_id": "placeholder_private_key_id",
            "private_key": "-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-fbsvc@dream-weaver-x8hpz.iam.gserviceaccount.com",
            "client_id": "placeholder_client_id",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dream-weaver-x8hpz.iam.gserviceaccount.com"
        }
        with open(firebase_json_path, "w", encoding="utf-8") as f:
            json.dump(default_firebase_json, f, indent=2)
        logger.info(f"Created placeholder Firebase service account JSON at: {firebase_json_path}")
    else:
        logger.info(f"Firebase Admin service account JSON verified: {firebase_json_path}")

    logger.info("Backend structure verification completed. System is self-healed and operational.")

if __name__ == "__main__":
    init_backend()
