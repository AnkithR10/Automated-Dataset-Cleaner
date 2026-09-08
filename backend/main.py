import os
import uvicorn
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.config import settings
from backend.routes import auth, payments, cleaner, admin, billing, payment

def check_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    load_dotenv(env_path)
    required_keys = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "ADMIN_EMAIL"]
    missing = [key for key in required_keys if not os.getenv(key)]
    if missing:
        print(f"CRITICAL: Missing environment variables: {missing}")

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-ready FastAPI backend boilerplate with Firebase Auth and Razorpay integrations.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
async def startup_event():
    check_env()

# CORS Middleware config
# Cross-origin resources are restricted in Next.js development and production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://(.*\.)?vercel\.app|https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route groups
app.include_router(auth.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(cleaner.router)
app.include_router(admin.router)
app.include_router(billing.router)
app.include_router(payment.router)

# Health Check Route
@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    """
    Standard health check endpoint indicating server responsiveness.
    Useful for container deployment verification and monitoring.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

# Local startup wrapper
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
