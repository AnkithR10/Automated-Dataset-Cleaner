from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from backend.config import settings
from backend.services.razorpay_service import RazorpayService
from backend.dependencies import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])

# Dependency to get Razorpay Service instance
def get_razorpay_service() -> RazorpayService:
    return RazorpayService(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET
    )

# Pydantic schemas for request validation
class OrderCreateRequest(BaseModel):
    amount: int = Field(..., description="Amount to charge in lowest currency unit (e.g. 50000 for 500.00 INR)", gt=0)
    currency: str = Field(default="INR", description="Three-letter ISO currency code")
    receipt: Optional[str] = Field(default=None, description="Unique transaction reference ID")

class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str = Field(..., description="Order ID returned by Razorpay API")
    razorpay_payment_id: str = Field(..., description="Payment ID returned by Razorpay Checkout")
    razorpay_signature: str = Field(..., description="HMAC SHA256 signature returned by Razorpay Checkout")

# Endpoints
@router.post("/create-order", status_code=status.HTTP_201_CREATED)
async def create_payment_order(
    request: OrderCreateRequest,
    razorpay_service: RazorpayService = Depends(get_razorpay_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a Razorpay order. Returns order ID and pricing info for the checkout script.
    """
    try:
        order = razorpay_service.create_order(
            amount_in_paise=request.amount,
            currency=request.currency,
            receipt=request.receipt
        )
        return {
            "status": "success",
            "order": order
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during order generation: {str(e)}"
        )

@router.post("/verify-payment")
async def verify_payment(
    request: PaymentVerificationRequest,
    razorpay_service: RazorpayService = Depends(get_razorpay_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies the cryptographic signature returned by the client-side Razorpay Checkout.
    This guarantees that the transaction succeeded and was not tampered with.
    """
    is_valid = razorpay_service.verify_payment_signature(
        order_id=request.razorpay_order_id,
        payment_id=request.razorpay_payment_id,
        signature=request.razorpay_signature
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cryptographic signature verification failed. The payment may be invalid."
        )
        
    return {
        "status": "success",
        "message": "Payment verified successfully.",
        "data": {
            "order_id": request.razorpay_order_id,
            "payment_id": request.razorpay_payment_id
        }
    }
