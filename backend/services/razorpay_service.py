import logging
import hmac
import hashlib
from typing import Dict, Any, Optional
import razorpay

logger = logging.getLogger(__name__)

class RazorpayService:
    """
    Service class to interact with the Razorpay API.
    Handles order creation and cryptographic webhook/payment verification.
    """
    def __init__(self, key_id: Optional[str], key_secret: Optional[str]):
        self.key_id = key_id
        self.key_secret = key_secret
        
        if not self.key_id or not self.key_secret:
            logger.warning(
                "Razorpay Key ID or Secret is missing from environment. "
                "Razorpay client will run in mock/placeholder mode."
            )
            self.client = None
        else:
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            except Exception as e:
                logger.error(f"Failed to initialize Razorpay Client: {str(e)}")
                self.client = None

    def create_order(self, amount_in_paise: int, currency: str = "INR", receipt: Optional[str] = None) -> Dict[str, Any]:
        """
        Creates a new payment order in Razorpay.
        :param amount_in_paise: The payment amount in lowest currency unit (e.g., 50000 for 500.00 INR)
        :param currency: Three-letter ISO currency code (default: INR)
        :param receipt: Unique identifier for this transaction receipt
        :return: Dict containing order details or error description
        """
        if not self.client:
            logger.warning("Razorpay client not initialized. Returning mock order.")
            # Return dummy order details for development convenience
            return {
                "id": "order_mock_12345abcde",
                "entity": "order",
                "amount": amount_in_paise,
                "amount_paid": 0,
                "amount_due": amount_in_paise,
                "currency": currency,
                "receipt": receipt or "receipt_mock_1",
                "status": "created",
                "attempts": 0,
                "notes": [],
                "created_at": 1700000000,
                "mock": True
            }
        
        try:
            data = {
                "amount": amount_in_paise,
                "currency": currency,
                "receipt": receipt or f"receipt_{amount_in_paise}",
                "payment_capture": 1 # Auto capture payment
            }
            order = self.client.order.create(data=data)
            return order
        except Exception as e:
            logger.error(f"Error creating Razorpay order: {str(e)}")
            raise ValueError(f"Razorpay order creation failed: {str(e)}")

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Cryptographically verifies the Razorpay payment signature.
        This ensures that the payment details returned by checkout are legitimate.
        
        Formula: SHA256-HMAC(order_id + "|" + payment_id, key_secret)
        """
        if not self.key_secret:
            logger.warning("Razorpay Key Secret is missing. Bypassing signature verification (Mock Mode).")
            # If in mock/dev mode, check if order_id is a mock one or permit development bypass
            if "mock" in order_id:
                return True
            return False

        try:
            # Recreate signature payload
            payload = f"{order_id}|{payment_id}".encode("utf-8")
            secret = self.key_secret.encode("utf-8")
            
            generated_signature = hmac.new(
                secret,
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Use constant-time comparison to prevent timing attacks
            return hmac.compare_digest(generated_signature, signature)
        except Exception as e:
            logger.error(f"Error verifying Razorpay signature: {str(e)}")
            return False
