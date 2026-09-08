"""
billing.py — Multi-tier subscription logic with CurrencyService.

Architecture note:
  Subscriptions are stored in an in-memory dict keyed by user_email.
  To make this persistent, replace `subscriptions_db` reads/writes
  with Firestore document operations on collection "subscriptions/{email}".
"""
import os
import time
import logging
import threading
from typing import Any, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tier definitions
# ---------------------------------------------------------------------------
TIERS: Dict[str, Dict[str, Any]] = {
    "individual_free": {
        "display_name": "Individual Free",
        "price_usd": 0,
        "price_inr": 0,
        "quota_limit": 5,
        "seats": 1,
        "is_paid": False,
        "group": "individual",
    },
    "individual_go": {
        "display_name": "Individual Go",
        "price_usd": 9,
        "price_inr": 750,
        "quota_limit": 20,
        "seats": 1,
        "is_paid": True,
        "group": "individual",
    },
    "individual_plus": {
        "display_name": "Individual Plus",
        "price_usd": 20,
        "price_inr": 1500,
        "quota_limit": 50,
        "seats": 1,
        "is_paid": True,
        "group": "individual",
    },
    "individual_pro": {
        "display_name": "Individual Pro",
        "price_usd": 49,
        "price_inr": 4000,
        "quota_limit": None,
        "seats": 1,
        "is_paid": True,
        "group": "individual",
    },
    "enterprise_free": {
        "display_name": "Enterprise Free",
        "price_usd": 0,
        "price_inr": 0,
        "quota_limit": 10,
        "seats": 1,
        "is_paid": False,
        "group": "enterprise",
    },
    "enterprise_plus": {
        "display_name": "Enterprise Plus",
        "price_usd": 100,
        "price_inr": 8000,
        "quota_limit": 500,
        "seats": 10,
        "is_paid": True,
        "group": "enterprise",
    },
    "enterprise_pro": {
        "display_name": "Enterprise Pro",
        "price_usd": 299,
        "price_inr": 25000,
        "quota_limit": None,
        "seats": 999999,
        "is_paid": True,
        "group": "enterprise",
    },
}

# ---------------------------------------------------------------------------
# In-memory subscription store
# Structure per entry:
#   {
#     "tier": str,
#     "billing_cycle": "monthly" | "yearly" | None,
#     "is_active": bool,
#     "currency": str,          # user's preferred display currency
#     "monthly_uploads": int,   # uploads this calendar month
#     "month_key": str,         # "YYYY-MM" for reset detection
#     "seat_members": list[str],# corporate: list of member emails
#     "manual_override": bool,  # Founder Mode admin override
#     "subscribed_at": float,   # unix timestamp
#   }
# ---------------------------------------------------------------------------
subscriptions_db: Dict[str, Dict[str, Any]] = {}
_db_lock = threading.Lock()

_firestore_db = None
_fs_init_attempted = False

def get_firestore_db():
    global _firestore_db, _fs_init_attempted
    if _fs_init_attempted:
        return _firestore_db
    _fs_init_attempted = True
    try:
        from firebase_admin import firestore
        _firestore_db = firestore.client()
        logger.info("Firestore client successfully retrieved lazily in billing.py")
    except Exception as e:
        logger.warning(f"Failed to get Firestore client in billing.py: {e}. Using in-memory fallback database.")
        _firestore_db = None
    return _firestore_db

def _default_entry(email: str) -> Dict[str, Any]:
    return {
        "tier": "individual_free",
        "billing_cycle": None,
        "is_active": True,
        "currency": "USD",
        "monthly_uploads": 0,
        "month_key": datetime.now(timezone.utc).strftime("%Y-%m"),
        "seat_members": [email],
        "manual_override": False,
        "subscribed_at": time.time(),
        "pending_cancellation": False,
        "discount_applied": False,
    }


def _get_or_create(email: str) -> Dict[str, Any]:
    with _db_lock:
        if email not in subscriptions_db:
            subscriptions_db[email] = _default_entry(email)
        return subscriptions_db[email]


# ---------------------------------------------------------------------------
# CurrencyService
# ---------------------------------------------------------------------------
_currency_cache: Dict[str, Any] = {}
_cache_ttl = 3600  # 1 hour

class CurrencyService:
    """Fetches live exchange rates from exchangerate-api.com (cached 1hr)."""

    BASE_URL = "https://v6.exchangerate-api.com/v6/{key}/latest/INR"

    @staticmethod
    def get_rates() -> Dict[str, float]:
        """Returns conversion rates relative to INR (1 INR = X target)."""
        now = time.time()
        if _currency_cache.get("fetched_at", 0) + _cache_ttl > now:
            return _currency_cache.get("rates", {"INR": 1.0, "USD": 0.012, "EUR": 0.011})

        api_key = os.getenv("CURRENCY_API_KEY", "")
        if not api_key:
            logger.warning("CURRENCY_API_KEY not set — using hardcoded fallback rates.")
            rates = {"INR": 1.0, "USD": 0.012, "EUR": 0.011}
            _currency_cache.update({"rates": rates, "fetched_at": now})
            return rates

        try:
            import httpx
            url = CurrencyService.BASE_URL.format(key=api_key)
            resp = httpx.get(url, timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
            conv = data.get("conversion_rates", {})
            rates = {
                "INR": 1.0,
                "USD": conv.get("USD", 0.012),
                "EUR": conv.get("EUR", 0.011),
            }
            _currency_cache.update({"rates": rates, "fetched_at": now})
            logger.info("Currency rates refreshed from API.")
            return rates
        except Exception as e:
            logger.error(f"Currency rate fetch failed: {e}. Using fallback.")
            rates = {"INR": 1.0, "USD": 0.012, "EUR": 0.011}
            _currency_cache.update({"rates": rates, "fetched_at": now})
            return rates

    @staticmethod
    def convert(amount_inr: float, target_currency: str) -> float:
        """Converts an INR amount to the target currency, rounded to 2dp."""
        rates = CurrencyService.get_rates()
        rate = rates.get(target_currency.upper(), 1.0)
        return round(amount_inr * rate, 2)


# ---------------------------------------------------------------------------
# BillingService
# ---------------------------------------------------------------------------
class BillingService:

    @staticmethod
    def check_subscription_status(user_email: str) -> Dict[str, Any]:
        """
        Returns the full subscription status for a user.
        Resets monthly upload counter automatically when a new month begins.
        """
        if user_email == "ankith.ravishankar@gmail.com":
            return {
                "is_active": True,
                "tier_type": "enterprise_pro",
                "tier_display": "Founder Mode (Unlimited)",
                "billing_cycle": "yearly",
                "seats_total": 999999,
                "seats_remaining": 999999,
                "seat_members": ["ankith.ravishankar@gmail.com"],
                "currency": "INR",
                "monthly_uploads_used": 0,
                "quota_limit": None,
                "is_paid": True,
                "manual_override": True,
                "pending_cancellation": False,
                "discount_applied": False,
                "subscribed_at": time.time() - 10 * 24 * 3600,
            }

        # Try to retrieve from Firestore
        db = get_firestore_db()
        firestore_data = None
        doc_ref = None
        if db:
            try:
                doc_ref = db.collection("users").document(user_email)
                doc = doc_ref.get()
                if doc.exists:
                    firestore_data = doc.to_dict()
            except Exception as e:
                logger.error(f"Firestore read error for user {user_email}: {e}")

        current_month = datetime.now(timezone.utc).strftime("%Y-%m")

        if firestore_data:
            tier = firestore_data.get("plan_type", "individual_free")
            billing_cycle = firestore_data.get("billing_cycle")
            currency = firestore_data.get("currency", "USD")
            monthly_uploads = firestore_data.get("monthly_uploads_used", 0)
            status_str = firestore_data.get("status", "active")
            subscribed_at = firestore_data.get("subscribed_at", time.time())
            pending_cancellation = firestore_data.get("pending_cancellation", False)
            discount_applied = firestore_data.get("discount_applied", False)
            seat_members = firestore_data.get("seat_members", [user_email])
            manual_override = firestore_data.get("manual_override", False)

            # Auto-reset monthly counter in Firestore on new calendar month
            if firestore_data.get("month_key") != current_month:
                monthly_uploads = 0
                if doc_ref:
                    try:
                        doc_ref.update({
                            "monthly_uploads_used": 0,
                            "month_key": current_month
                        })
                    except Exception as update_err:
                        logger.error(f"Failed to reset monthly uploads in Firestore: {update_err}")

            tier_info = TIERS.get(tier, TIERS["individual_free"])
            quota_limit = tier_info["quota_limit"]
            is_paid = tier_info["is_paid"]

            if manual_override:
                is_active = True
            elif is_paid:
                is_active = status_str == "active" or status_str == "pending_cancel"
            else:
                used = monthly_uploads
                limit = quota_limit if quota_limit is not None else float("inf")
                is_active = used < limit

            # Sync local cache in memory as backup
            entry = _get_or_create(user_email)
            with _db_lock:
                entry["tier"] = tier
                entry["billing_cycle"] = billing_cycle
                entry["currency"] = currency
                entry["monthly_uploads"] = monthly_uploads
                entry["month_key"] = current_month
                entry["subscribed_at"] = subscribed_at
                entry["pending_cancellation"] = pending_cancellation
                entry["discount_applied"] = discount_applied
                entry["manual_override"] = manual_override

            return {
                "is_active": is_active,
                "tier_type": tier,
                "tier_display": tier_info["display_name"],
                "billing_cycle": billing_cycle,
                "seats_total": tier_info["seats"],
                "seats_remaining": max(0, tier_info["seats"] - len(seat_members)),
                "seat_members": seat_members,
                "currency": currency,
                "monthly_uploads_used": monthly_uploads,
                "quota_limit": quota_limit,
                "is_paid": is_paid,
                "manual_override": manual_override,
                "pending_cancellation": pending_cancellation,
                "discount_applied": discount_applied,
                "subscribed_at": subscribed_at,
            }

        # Fallback to local memory db
        entry = _get_or_create(user_email)
        with _db_lock:
            if entry["month_key"] != current_month:
                entry["monthly_uploads"] = 0
                entry["month_key"] = current_month

            tier_info = TIERS.get(entry["tier"], TIERS["individual_free"])
            quota_limit = tier_info["quota_limit"]
            is_paid = tier_info["is_paid"]
            manual_override = entry.get("manual_override", False)
            pending_cancellation = entry.get("pending_cancellation", False)
            discount_applied = entry.get("discount_applied", False)

            if manual_override:
                is_active = True
            elif is_paid:
                is_active = entry.get("is_active", True)
            else:
                used = entry["monthly_uploads"]
                limit = quota_limit if quota_limit is not None else float("inf")
                is_active = used < limit

            # If Firestore is available but user wasn't present, populate default document
            if db and doc_ref:
                try:
                    doc_ref.set({
                        "plan_type": entry["tier"],
                        "status": "active",
                        "billing_cycle": entry["billing_cycle"],
                        "currency": entry["currency"],
                        "monthly_uploads_used": entry["monthly_uploads"],
                        "month_key": entry["month_key"],
                        "seat_members": entry["seat_members"],
                        "manual_override": manual_override,
                        "subscribed_at": entry["subscribed_at"],
                        "pending_cancellation": pending_cancellation,
                        "discount_applied": discount_applied,
                    }, merge=True)
                except Exception as e:
                    logger.error(f"Failed to create document in Firestore during status fetch: {e}")

            return {
                "is_active": is_active,
                "tier_type": entry["tier"],
                "tier_display": tier_info["display_name"],
                "billing_cycle": entry["billing_cycle"],
                "seats_total": tier_info["seats"],
                "seats_remaining": max(0, tier_info["seats"] - len(entry["seat_members"])),
                "seat_members": entry["seat_members"],
                "currency": entry["currency"],
                "monthly_uploads_used": entry["monthly_uploads"],
                "quota_limit": quota_limit,
                "is_paid": is_paid,
                "manual_override": manual_override,
                "pending_cancellation": pending_cancellation,
                "discount_applied": discount_applied,
                "subscribed_at": entry.get("subscribed_at", time.time()),
            }

    @staticmethod
    def record_upload(user_email: str) -> None:
        """Increments the monthly upload counter for a user."""
        if user_email == "ankith.ravishankar@gmail.com":
            logger.info(f"Skipping record_upload for admin {user_email}")
            return
        entry = _get_or_create(user_email)
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        with _db_lock:
            if entry["month_key"] != current_month:
                entry["monthly_uploads"] = 0
                entry["month_key"] = current_month
            entry["monthly_uploads"] += 1
            logger.info(f"Recorded upload for {user_email}. Total this month: {entry['monthly_uploads']}")

        # Sync to Firestore
        db = get_firestore_db()
        if db:
            try:
                doc_ref = db.collection("users").document(user_email)
                doc = doc_ref.get()
                if doc.exists:
                    curr_used = doc.get("monthly_uploads_used") or 0
                    doc_ref.update({
                        "monthly_uploads_used": curr_used + 1,
                        "month_key": current_month
                    })
                else:
                    doc_ref.set({
                        "monthly_uploads_used": 1,
                        "month_key": current_month
                    }, merge=True)
            except Exception as e:
                logger.error(f"Failed to record upload in Firestore: {e}")

    @staticmethod
    def set_tier(
        user_email: str,
        tier: str,
        billing_cycle: Optional[str] = None,
        currency: str = "INR",
    ) -> Dict[str, Any]:
        """Sets the subscription tier for a user after successful payment."""
        if tier not in TIERS:
            raise ValueError(f"Unknown tier: {tier}. Valid: {list(TIERS.keys())}")
        entry = _get_or_create(user_email)
        with _db_lock:
            entry["tier"] = tier
            entry["billing_cycle"] = billing_cycle
            entry["currency"] = currency
            entry["is_active"] = True
            entry["subscribed_at"] = time.time()
            entry["pending_cancellation"] = False
            entry["discount_applied"] = False
        logger.info(f"Subscription updated locally for {user_email}: tier={tier}, cycle={billing_cycle}")

        # Immediately set plan_type and status: 'active' in Firestore
        db = get_firestore_db()
        if db:
            try:
                db.collection("users").document(user_email).set({
                    "plan_type": tier,
                    "status": "active",
                    "billing_cycle": billing_cycle,
                    "currency": currency,
                    "subscribed_at": time.time(),
                    "pending_cancellation": False,
                    "discount_applied": False,
                }, merge=True)
                logger.info(f"Firestore synced for {user_email}: plan_type={tier}, status=active")
            except Exception as e:
                logger.error(f"Failed to write subscription to Firestore for {user_email}: {e}")

        return BillingService.check_subscription_status(user_email)

    @staticmethod
    def manual_override(user_email: str, is_premium: bool) -> Dict[str, Any]:
        """Founder Mode: Manually grant or revoke premium status for any user."""
        entry = _get_or_create(user_email)
        with _db_lock:
            entry["manual_override"] = is_premium
            if is_premium and entry["tier"] == "individual_free":
                entry["tier"] = "individual_pro"
        logger.info(f"Founder override: {user_email} isPremium={is_premium}")

        db = get_firestore_db()
        if db:
            try:
                db.collection("users").document(user_email).set({
                    "manual_override": is_premium,
                    "plan_type": "individual_pro" if (is_premium and entry["tier"] == "individual_free") else entry["tier"]
                }, merge=True)
            except Exception as e:
                logger.error(f"Failed to set manual_override in Firestore: {e}")

        return BillingService.check_subscription_status(user_email)

    @staticmethod
    def cancel_subscription(user_email: str) -> Dict[str, Any]:
        """Sets pending_cancellation to True. Downgrade is completed at end of cycle."""
        entry = _get_or_create(user_email)
        with _db_lock:
            entry["pending_cancellation"] = True

        db = get_firestore_db()
        if db:
            try:
                db.collection("users").document(user_email).set({
                    "pending_cancellation": True,
                    "status": "pending_cancel"
                }, merge=True)
                logger.info(f"Cancelled subscription in Firestore (pending_cancel) for {user_email}")
            except Exception as e:
                logger.error(f"Failed to cancel subscription in Firestore: {e}")

        return BillingService.check_subscription_status(user_email)

    @staticmethod
    def apply_coupon(user_email: str) -> Dict[str, Any]:
        """Applies a 20% discount coupon to maximize retention."""
        entry = _get_or_create(user_email)
        with _db_lock:
            entry["discount_applied"] = True

        db = get_firestore_db()
        if db:
            try:
                db.collection("users").document(user_email).set({
                    "discount_applied": True
                }, merge=True)
                logger.info(f"Applied 20% discount in Firestore for {user_email}")
            except Exception as e:
                logger.error(f"Failed to apply coupon in Firestore: {e}")

        return BillingService.check_subscription_status(user_email)

    @staticmethod
    def get_all_subscriptions() -> Dict[str, Any]:
        """Returns aggregate metrics for Founder Mode dashboard."""
        db = get_firestore_db()
        if db:
            try:
                docs = db.collection("users").stream()
                total_users = 0
                active_paid = 0
                total_revenue_inr = 0
                tier_breakdown = {}
                for doc in docs:
                    data = doc.to_dict()
                    t = data.get("plan_type", "individual_free")
                    status_str = data.get("status", "active")
                    manual_override = data.get("manual_override", False)
                    
                    tier_info = TIERS.get(t, TIERS["individual_free"])
                    is_paid = tier_info["is_paid"]
                    
                    total_users += 1
                    if is_paid or manual_override:
                        active_paid += 1
                    total_revenue_inr += tier_info.get("price_inr", 0)
                    tier_breakdown[t] = tier_breakdown.get(t, 0) + 1
                    
                return {
                    "total_users": total_users,
                    "active_paid_users": active_paid,
                    "total_revenue_inr": total_revenue_inr,
                    "tier_breakdown": tier_breakdown,
                }
            except Exception as e:
                logger.error(f"Firestore get_all_subscriptions error: {e}. Using local cache.")

        # Fallback
        with _db_lock:
            all_entries = dict(subscriptions_db)

        total_users = len(all_entries)
        active_paid = sum(
            1 for e in all_entries.values()
            if TIERS.get(e["tier"], {}).get("is_paid", False) or e.get("manual_override", False)
        )
        total_revenue_inr = sum(
            TIERS.get(e["tier"], {}).get("price_inr", 0)
            for e in all_entries.values()
        )

        tier_breakdown: Dict[str, int] = {}
        for e in all_entries.values():
            t = e["tier"]
            tier_breakdown[t] = tier_breakdown.get(t, 0) + 1

        return {
            "total_users": total_users,
            "active_paid_users": active_paid,
            "total_revenue_inr": total_revenue_inr,
            "tier_breakdown": tier_breakdown,
        }

    @staticmethod
    def add_seat_member(owner_email: str, member_email: str) -> Dict[str, Any]:
        """Add a member to a corporate plan seat."""
        entry = _get_or_create(owner_email)
        tier_info = TIERS.get(entry["tier"], TIERS["individual_free"])
        with _db_lock:
            if member_email not in entry["seat_members"]:
                if len(entry["seat_members"]) >= tier_info["seats"]:
                    raise ValueError(f"Seat limit of {tier_info['seats']} reached for {owner_email}.")
                entry["seat_members"].append(member_email)

        db = get_firestore_db()
        if db:
            try:
                db.collection("users").document(owner_email).update({
                    "seat_members": entry["seat_members"]
                })
            except Exception as e:
                logger.error(f"Failed to add seat member in Firestore: {e}")

        return BillingService.check_subscription_status(owner_email)

        return BillingService.check_subscription_status(user_email)

    @staticmethod
    def manual_override(user_email: str, is_premium: bool) -> Dict[str, Any]:
        """Founder Mode: Manually grant or revoke premium status for any user."""
        entry = _get_or_create(user_email)
        with _db_lock:
            entry["manual_override"] = is_premium
            if is_premium and entry["tier"] == "individual_free":
                entry["tier"] = "individual_pro"
        logger.info(f"Founder override: {user_email} isPremium={is_premium}")
        return BillingService.check_subscription_status(user_email)

    @staticmethod
    def get_all_subscriptions() -> Dict[str, Any]:
        """Returns aggregate metrics for Founder Mode dashboard."""
        with _db_lock:
            all_entries = dict(subscriptions_db)

        total_users = len(all_entries)
        active_paid = sum(
            1 for e in all_entries.values()
            if TIERS.get(e["tier"], {}).get("is_paid", False) or e.get("manual_override", False)
        )
        total_revenue_inr = sum(
            TIERS.get(e["tier"], {}).get("price_inr", 0)
            for e in all_entries.values()
        )

        tier_breakdown: Dict[str, int] = {}
        for e in all_entries.values():
            t = e["tier"]
            tier_breakdown[t] = tier_breakdown.get(t, 0) + 1

        return {
            "total_users": total_users,
            "active_paid_users": active_paid,
            "total_revenue_inr": total_revenue_inr,
            "tier_breakdown": tier_breakdown,
        }

    @staticmethod
    def add_seat_member(owner_email: str, member_email: str) -> Dict[str, Any]:
        """Add a member to a corporate plan seat."""
        entry = _get_or_create(owner_email)
        tier_info = TIERS.get(entry["tier"], TIERS["individual_free"])
        with _db_lock:
            if member_email not in entry["seat_members"]:
                if len(entry["seat_members"]) >= tier_info["seats"]:
                    raise ValueError(f"Seat limit of {tier_info['seats']} reached for {owner_email}.")
                entry["seat_members"].append(member_email)
        return BillingService.check_subscription_status(owner_email)


class QuotaManager:
    @staticmethod
    def validate_user_plan(user_email: str) -> bool:
        """
        Validates whether the user's plan permits another processing task.
        Raises ValueError if quota is exceeded.
        """
        if user_email == "ankith.ravishankar@gmail.com":
            return True
        status = BillingService.check_subscription_status(user_email)
        if not status["is_active"]:
            used = status["monthly_uploads_used"]
            limit = status["quota_limit"]
            raise ValueError(f"Monthly processing quota reached ({used}/{limit}). Please upgrade your plan.")
        return True

    @staticmethod
    def validate_feature_access(user_email: str, feature: str) -> bool:
        """
        Validates whether the user's active plan tier permits accessing a specific premium feature.
        Raises ValueError if unauthorized.
        """
        if user_email == "ankith.ravishankar@gmail.com":
            return True
        status = BillingService.check_subscription_status(user_email)
        is_premium = status.get("is_paid", False) or status.get("manual_override", False)
        
        if feature in ["xai", "simulation", "regression_suggestions", "clustering_suggestions"]:
            if not is_premium:
                raise ValueError(f"Feature '{feature}' is locked on the Free plan. Please upgrade to a premium plan.")
        return True
