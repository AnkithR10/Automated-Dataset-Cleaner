import time
import os
import logging
from fastapi import APIRouter, status, Depends, HTTPException
from backend.dependencies import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"])

# Record the time the server started for uptime calculation
_server_start_time = time.time()


@router.get("/api/admin/health", status_code=status.HTTP_200_OK)
async def admin_health(admin_user: dict = Depends(require_admin)):
    """
    Founder Mode system health endpoint.
    Returns server uptime, job counts, Razorpay config, and billing metrics.
    Intended for authenticated owner access only.
    """
    from backend.routes.cleaner import jobs_db
    from backend.services.billing import BillingService

    uptime_seconds = int(time.time() - _server_start_time)
    all_jobs = list(jobs_db.values())

    active_jobs = len([j for j in all_jobs if j["status"] in ("Pending", "Processing")])
    completed_jobs = len([j for j in all_jobs if j["status"] == "Completed"])
    failed_jobs = len([j for j in all_jobs if j["status"] == "Failed"])

    razorpay_key = os.getenv("RAZORPAY_KEY_ID", "")
    razorpay_mode = "test" if razorpay_key.startswith("rzp_test_") else (
        "live" if razorpay_key.startswith("rzp_live_") else "not_configured"
    )

    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime_human = f"{hours}h {minutes}m {seconds}s"

    # Billing aggregate metrics
    try:
        billing_metrics = BillingService.get_all_subscriptions()
    except Exception as e:
        logger.warning(f"Could not fetch billing metrics: {e}")
        billing_metrics = {}

    logger.info("Founder Mode health check requested.")

    return {
        "server_status": "healthy",
        "uptime_seconds": uptime_seconds,
        "uptime_human": uptime_human,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "razorpay_mode": razorpay_mode,
        "jobs": {
            "total": len(all_jobs),
            "active": active_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
        },
        "billing": billing_metrics,
    }


@router.get("/system-metrics")
async def get_metrics(admin_user: dict = Depends(require_admin)):
    return {"status": "operational", "active_users": 100}
