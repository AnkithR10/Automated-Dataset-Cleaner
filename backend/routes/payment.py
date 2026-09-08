from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional
import logging

from backend.dependencies import get_current_user
from backend.services.payment import create_order, verify_signature, client
from backend.services.billing import BillingService
from firebase_admin import firestore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payment", tags=["Payment"])

class CreateOrderRequest(BaseModel):
    amount: float = Field(..., description="Amount in main currency unit (e.g. 5.00 for 5 INR)", gt=0)

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(..., description="Razorpay order ID")
    razorpay_payment_id: str = Field(..., description="Razorpay payment ID")
    razorpay_signature: str = Field(..., description="Razorpay cryptographic signature")
    tier: str = Field(..., description="Target subscription tier key")
    billing_cycle: Optional[str] = Field(None, description="Billing cycle: monthly or yearly")
    currency: str = Field(default="INR", description="Preferred user currency")

@router.post("/create")
async def create_payment_order(
    body: CreateOrderRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a secure Razorpay order. Returns the order ID.
    Protected by Firebase token authentication.
    """
    try:
        order = create_order(amount=body.amount)
        return {"order_id": order["id"]}
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )

@router.post("/verify")
async def verify_payment_endpoint(
    body: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifies the Razorpay payment signature. If valid, updates the user's subscription tier.
    """
    try:
        is_mock_payment = (
            body.razorpay_order_id.startswith("order_mock_") or 
            body.razorpay_signature == "mock_signature_value" or
            (current_user.get("uid") and current_user.get("uid").startswith("mock_uid_"))
        )
        
        if client and not is_mock_payment:
            params_dict = {
                'razorpay_order_id': body.razorpay_order_id,
                'razorpay_payment_id': body.razorpay_payment_id,
                'razorpay_signature': body.razorpay_signature
            }
            client.utility.verify_payment_signature(params_dict)
        else:
            # Fallback for mock mode or mock payment IDs
            is_valid = verify_signature(
                order_id=body.razorpay_order_id,
                payment_id=body.razorpay_payment_id,
                signature=body.razorpay_signature
            )
            if not is_valid:
                raise ValueError("Mock verification failed")
    except Exception as e:
        logger.warning(f"Payment verification failed for user {current_user.get('email')}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Verification failed."
        )
        
    try:
        user_email = current_user.get("email")
        user_id = current_user.get("uid")
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email missing from authenticated user token."
            )
            
        # Update user's subscription in backend database/in-memory store
        updated_sub = BillingService.set_tier(
            user_email=user_email,
            tier=body.tier,
            billing_cycle=body.billing_cycle,
            currency=body.currency
        )
        
        # Upon success, update Firestore reactively for the user UID
        if user_id:
            try:
                db_fs = firestore.client()
                target_tier = "Plus"
                if body.tier.lower() == "pro":
                    target_tier = "Pro"
                elif body.tier.lower() == "plus":
                    target_tier = "Plus"
                else:
                    target_tier = body.tier.capitalize()
                
                upload_limit = 20 if target_tier.lower() == "plus" else (100 if target_tier.lower() == "pro" else 5)
                
                doc_ref = db_fs.collection('users').document(user_id)
                try:
                    doc_ref.update({
                        'planTier': target_tier,
                        'isPremium': True,
                        'uploadLimit': upload_limit
                    })
                except Exception:
                    doc_ref.set({
                        'planTier': target_tier,
                        'isPremium': True,
                        'uploadLimit': upload_limit,
                        'uploadsUsed': 0
                    }, merge=True)
                logger.info(f"Updated Firestore user {user_id} planTier to {target_tier} and isPremium to True")
            except Exception as fs_err:
                logger.error(f"Firestore update failed: {fs_err}")
        
        logger.info(f"Payment verified. User {user_email} set to tier {body.tier}")
        return {
            "success": True,
            "message": "Payment verified and subscription activated.",
            "subscription": updated_sub
        }
    except Exception as e:
        logger.error(f"Error updating subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verified but failed to activate subscription: {str(e)}"
        )
