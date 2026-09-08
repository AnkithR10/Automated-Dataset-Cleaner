import razorpay
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Initialize keys
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

# Initialize client
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        logger.info("Razorpay Client successfully initialized in services/payment.py")
    except Exception as e:
        logger.error(f"Failed to initialize Razorpay Client: {e}")
        client = None
else:
    logger.warning("Razorpay keys not configured in services/payment.py. Client initialized in dummy/mock mode.")
    client = None

def create_order(amount: float) -> dict:
    """
    Creates a Razorpay order, converting the amount to paise.
    Returns the full order dictionary object.
    """
    amount_in_paise = int(amount * 100)
    
    if not client:
        logger.warning(f"Using mock order creation for amount: {amount_in_paise}")
        return {
            "id": f"order_mock_{amount_in_paise}",
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": "order_rcptid_11"
        }
        
    try:
        order = client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": "order_rcptid_11"
        })
        return order
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        raise ValueError(f"Razorpay order creation failed: {e}")

def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verifies the payment signature using Razorpay client utility.
    Returns True if valid.
    """
    if not client:
        logger.warning("Bypassing signature verification (Mock Mode).")
        return order_id.startswith("order_mock_")

    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
        return True
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        return False
