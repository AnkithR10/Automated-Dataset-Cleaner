import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query, Depends
from pydantic import BaseModel, EmailStr, Field
from backend.services.billing import BillingService, CurrencyService, TIERS
from backend.dependencies import require_admin, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Billing"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class SetTierRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    tier: str = Field(..., description="One of: free, individual_monthly, individual_yearly, corporate_monthly, corporate_yearly")
    billing_cycle: Optional[str] = Field(None, description="'monthly' or 'yearly'")
    currency: str = Field(default="INR", description="User's display currency")
    razorpay_payment_id: Optional[str] = Field(None, description="Razorpay payment ID for audit trail")


class OverrideRequest(BaseModel):
    email: str = Field(..., description="Target user email")
    is_premium: bool = Field(..., description="Grant (true) or revoke (false) premium")


class AddSeatRequest(BaseModel):
    owner_email: str = Field(..., description="Corporate plan owner email")
    member_email: str = Field(..., description="Email to add as a seat member")


# ---------------------------------------------------------------------------
# GET /api/billing/status
# ---------------------------------------------------------------------------
@router.get("/api/billing/status")
async def get_billing_status(
    current_user: dict = Depends(get_current_user)
):
    """Returns full subscription status for the currently authenticated user."""
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email claim missing from token.")
    try:
        return BillingService.check_subscription_status(email)
    except Exception as e:
        logger.error(f"billing/status error for {email}: {e}")
        raise HTTPException(status_code=550, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/billing/set-tier
# ---------------------------------------------------------------------------
@router.post("/api/billing/set-tier", status_code=status.HTTP_200_OK)
async def set_subscription_tier(
    body: SetTierRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Called after a successful Razorpay payment to record the subscription tier.
    """
    if body.email != current_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot modify subscription tier for another user."
        )
    if body.tier not in TIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tier '{body.tier}'. Valid options: {list(TIERS.keys())}"
        )
    try:
        result = BillingService.set_tier(
            user_email=body.email,
            tier=body.tier,
            billing_cycle=body.billing_cycle,
            currency=body.currency,
        )
        logger.info(f"Tier set for {body.email}: {body.tier} [payment: {body.razorpay_payment_id}]")
        return {"success": True, "subscription": result}
    except Exception as e:
        logger.error(f"set-tier error for {body.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /api/billing/currency-rates
# ---------------------------------------------------------------------------
@router.get("/api/billing/currency-rates")
async def get_currency_rates():
    """Returns live INR → USD/EUR/INR conversion rates (cached 1hr)."""
    try:
        rates = CurrencyService.get_rates()
        return {
            "base": "INR",
            "rates": rates,
            "symbols": {"INR": "₹", "USD": "$", "EUR": "€"},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rate fetch failed: {e}")


# ---------------------------------------------------------------------------
# GET /api/billing/tiers
# ---------------------------------------------------------------------------
@router.get("/api/billing/tiers")
async def get_tier_definitions():
    """Returns all tier definitions and their USD/INR prices for the pricing page."""
    return {"tiers": TIERS}


# ---------------------------------------------------------------------------
# POST /api/admin/override  (Founder Mode)
# ---------------------------------------------------------------------------
@router.post("/api/admin/override", status_code=status.HTTP_200_OK)
async def founder_override(body: OverrideRequest, admin_user: dict = Depends(require_admin)):
    """
    Founder Mode exclusive: manually grant or revoke premium for any user.
    In production, protect this endpoint with a signed header or admin token.
    """
    try:
        result = BillingService.manual_override(body.email, body.is_premium)
        logger.info(f"Founder override applied: {body.email} → isPremium={body.is_premium}")
        return {"success": True, "subscription": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/billing/cancel
# ---------------------------------------------------------------------------
@router.post("/api/billing/cancel", status_code=status.HTTP_200_OK)
async def cancel_subscription(
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel subscription: marks it pending cancellation (to be downgraded to free at period end).
    """
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email claim missing from token.")
    try:
        result = BillingService.cancel_subscription(email)
        logger.info(f"Subscription set to pending_cancellation for {email}")
        return {"success": True, "subscription": result}
    except Exception as e:
        logger.error(f"cancel subscription error for {email}: {e}")
        raise HTTPException(status_code=550, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/billing/apply-discount
# ---------------------------------------------------------------------------
@router.post("/api/billing/apply-discount", status_code=status.HTTP_200_OK)
async def apply_retention_discount(
    current_user: dict = Depends(get_current_user)
):
    """
    Applies the retention coupon (20% discount flag) to the user's subscription in Firestore.
    """
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email claim missing from token.")
    try:
        result = BillingService.apply_coupon(email)
        logger.info(f"Retention discount applied for {email}")
        return {"success": True, "subscription": result}
    except Exception as e:
        logger.error(f"apply retention discount error for {email}: {e}")
        raise HTTPException(status_code=550, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/billing/add-seat
# ---------------------------------------------------------------------------
@router.post("/api/billing/add-seat", status_code=status.HTTP_200_OK)
async def add_seat_member(
    body: AddSeatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a member email to a corporate plan's seat allocation."""
    if body.owner_email != current_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot add seat members to another account."
        )
    try:
        result = BillingService.add_seat_member(body.owner_email, body.member_email)
        return {"success": True, "subscription": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /api/billing/metrics  (Founder Mode aggregate stats)
# ---------------------------------------------------------------------------
@router.get("/api/billing/metrics")
async def get_billing_metrics(admin_user: dict = Depends(require_admin)):
    """
    Founder Mode: Returns aggregate subscription metrics.
    Includes total users, active paid users, revenue, and tier breakdown.
    """
    try:
        return BillingService.get_all_subscriptions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
