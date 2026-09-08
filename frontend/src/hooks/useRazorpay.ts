"use client";

import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface RazorpayOrderData {
  amount: number; // e.g. 500 for 500 INR
  currency: string;
  plan: string;
  cycle: string;
  tierKey: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (errorMsg: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const useRazorpay = () => {
  const { user } = useAuth();
  const router = useRouter();

  const displayRazorpay = async (orderData: RazorpayOrderData) => {
    try {
      // 1. Create Order on Backend (/api/payment/create) using custom Axios instance
      // The Axios request interceptor automatically appends the Bearer token
      const orderRes = await api.post("/api/payment/create", { amount: orderData.amount });
      const { order_id } = orderRes.data;

      // 2. Mock Mode Fallback (if no public key configured or if mock order is returned)
      const isMock = !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || order_id.startsWith("order_mock_");
      if (isMock) {
        console.warn("Razorpay: Running checkout in DEV/MOCK mode.");
        // Simulate a minor latency for premium UX
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Call verification directly with mock payloads using Axios
        const verifyRes = await api.post("/api/payment/verify", {
          razorpay_order_id: order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "mock_signature_value",
          tier: orderData.tierKey,
          billing_cycle: orderData.cycle,
          currency: orderData.currency, // Store user's preferred display currency
        });

        router.refresh();
        orderData.onSuccess(`pay_mock_${Date.now()}`);
        return;
      }

      // 3. Dynamic Script Injection (only needed for live checkout)
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you offline?");
      }

      // 4. Trigger window.Razorpay Modal (Live mode)
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: String(Math.round(orderData.amount * 100)), // Base INR amount in paise
        currency: "INR", // Always use INR for the gateway to match the backend order
        order_id: order_id,
        name: "Automated Dataset Cleaner",
        description: `${orderData.plan.toUpperCase()} Plan — ${orderData.cycle.toUpperCase()}`,
        prefill: {
          name: user?.displayName || "",
          email: user?.email || "",
        },
        theme: { color: "#1a1a1a" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 5. Secure Signature Verification using Axios
            await api.post("/api/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier: orderData.tierKey,
              billing_cycle: orderData.cycle,
              currency: orderData.currency, // Store user's preferred display currency
            });

            router.refresh();
            orderData.onSuccess(response.razorpay_payment_id);
          } catch (err: any) {
            const errorMsg = err.response?.data?.detail || err.message || "Payment verification failed.";
            orderData.onFailure(errorMsg);
          }
        },
        modal: {
          ondismiss: () => {
            orderData.onFailure("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (failedRes: any) => {
        orderData.onFailure(`Payment failed: ${failedRes.error?.description || "Transaction failed"}`);
      });
      rzp.open();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Payment initiation failed.";
      orderData.onFailure(errorMsg);
    }
  };

  return { displayRazorpay };
};
