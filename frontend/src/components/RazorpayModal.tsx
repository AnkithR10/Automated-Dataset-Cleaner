"use client";

import React from "react";
import { RazorpayCheckout } from "./RazorpayCheckout";

interface RazorpayModalProps {
  amount: number;
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

export function RazorpayModal(props: RazorpayModalProps) {
  return <RazorpayCheckout {...props} />;
}
