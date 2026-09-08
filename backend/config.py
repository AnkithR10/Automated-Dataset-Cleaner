import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Load environment variables explicitly from backend/.env into os.environ
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "FastAPI SaaS Boilerplate"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # CORS Settings
    # Reads a comma-separated list of origins from environment, or defaults to local Next.js ports
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Firebase Admin SDK Configuration
    FIREBASE_SERVICE_ACCOUNT_JSON_PATH: str = "configs/firebase-service-account.json"

    # Razorpay Secrets
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Resend Settings
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    # Currency conversion (exchangerate-api.com)
    CURRENCY_API_KEY: str = ""

    # Deployment context
    ENVIRONMENT: str = "development"

    # Founder Mode — the owner's email that gates Founder features
    OWNER_EMAIL: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate settings
settings = Settings()
