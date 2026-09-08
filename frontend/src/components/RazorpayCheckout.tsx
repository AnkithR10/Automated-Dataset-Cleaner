"use client";

import React, { useState } from "react";
import { useRazorpay } from "@/hooks/useRazorpay";
import { Loader2 } from "lucide-react";

interface RazorpayCheckoutProps {
  amount: number; // e.g. 500 for 500 INR
  currency: string;
  plan: string;
  cycle: string;
  tierKey: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (errorMsg: string) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function RazorpayCheckout({
  amount,
  currency,
  plan,
  cycle,
  tierKey,
  onSuccess,
  onFailure,
  children,
  className = "",
  disabled = false,
}: RazorpayCheckoutProps) {
  const { displayRazorpay } = useRazorpay();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (loading || disabled) return;
    setLoading(true);

    const wrappedSuccess = (paymentId: string) => {
      setLoading(false);
      onSuccess(paymentId);
    };

    const wrappedFailure = (errorMsg: string) => {
      setLoading(false);
      onFailure(errorMsg);
    };

    await displayRazorpay({
      amount,
      currency,
      plan,
      cycle,
      tierKey,
      onSuccess: wrappedSuccess,
      onFailure: wrappedFailure,
    });
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading || disabled}
      className={`relative cursor-pointer transition-all flex items-center justify-center gap-1.5 ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children || (loading ? "Initializing..." : "Upgrade Now")}
    </button>
  );
}
