"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Check,
  X,
  Zap,
  Building2,
  User,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { RazorpayCheckout } from "@/components/RazorpayCheckout";

type BillingCycle = "monthly" | "yearly";
type Currency = "INR" | "USD" | "EUR";
type PlanType = "free" | "plus" | "pro";

interface CurrencyMeta {
  symbol: string;
  label: string;
}

const CURRENCIES: Record<Currency, CurrencyMeta> = {
  INR: { symbol: "₹", label: "INR — Indian Rupee" },
  USD: { symbol: "$", label: "USD — US Dollar" },
  EUR: { symbol: "€", label: "EUR — Euro" },
};

// Base INR prices
const PRICES = {
  free: { monthly: 0, yearly: 0 },
  plus: { monthly: 1666, yearly: 16660 }, // ~$20/mo or ~$200/yr
  pro: { monthly: 8333, yearly: 83330 },  // ~$100/mo or ~$1000/yr
};

// Tier key mapping
const TIER_KEYS: Record<PlanType, Record<BillingCycle, string>> = {
  free: { monthly: "individual_free", yearly: "individual_free" },
  plus: { monthly: "individual_plus", yearly: "individual_plus" },
  pro: { monthly: "enterprise_plus", yearly: "enterprise_plus" },
};

const YEARLY_SAVING_PCT = 25;

interface CompareFeature {
  name: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
}

const COMPARISON_FEATURES: CompareFeature[] = [
  { name: "Monthly CSV Uploads", free: "5 uploads", plus: "50 uploads", pro: "500 uploads" },
  { name: "Remove duplicate rows", free: true, plus: true, pro: true },
  { name: "Standardize columns to snake_case", free: true, plus: true, pro: true },
  { name: "Missing cells imputation (mean/median/drop)", free: true, plus: true, pro: true },
  { name: "AI Model Suggestions Panel", free: "Basic (Classification only)", plus: "Yes (Full support)", pro: "Yes (Full support)" },
  { name: "Interactive Model Simulators & Logs", free: false, plus: true, pro: true },
  { name: "Explainable AI (Why? Model Detail)", free: false, plus: true, pro: true },
  { name: "Workspace Member Seats", free: "1 seat", plus: "1 seat", pro: "10 seats" },
  { name: "Priority Processing", free: false, plus: false, pro: true },
];

const BACKEND = process.env.NEXT_PUBLIC_API_URL as string;

export default function PricingPage() {
  const { isAuthenticated, loading, isPremium } = useAuth();
  const router = useRouter();

  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [rates, setRates] = useState<Record<Currency, number>>({ INR: 1, USD: 0.012, EUR: 0.011 });
  const [loadingRates, setLoadingRates] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const res = await fetch(`${BACKEND}/api/billing/currency-rates`);
      if (res.ok) {
        const data = await res.json();
        setRates({
          INR: data.rates.INR ?? 1,
          USD: data.rates.USD ?? 0.012,
          EUR: data.rates.EUR ?? 0.011,
        });
      }
    } catch (e) {
      // Silently fall back
    } finally {
      setLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = (amountInr: number): number => {
    const rate = rates[currency] ?? 1;
    return Math.round(amountInr * rate * 100) / 100;
  };

  const formatPriceDigits = (amountInr: number): string => {
    const converted = convert(amountInr);
    return converted.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const getPriceInr = (plan: PlanType): number => PRICES[plan][cycle];

  const handlePaymentSuccess = (plan: PlanType, paymentId: string) => {
    const tierKey = TIER_KEYS[plan][cycle];
    localStorage.setItem("isPremium", "true");
    localStorage.setItem("premiumPlan", tierKey);
    localStorage.setItem("razorpay_payment_id", paymentId);
    showToast(`Subscribed to ${plan.toUpperCase()} (${cycle})! Welcome.`, "success");
    setTimeout(() => router.push("/dashboard"), 1800);
  };

  const handlePaymentFailure = (errorMsg: string) => {
    showToast(errorMsg, "error");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-sans flex flex-col transition-colors duration-300">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-blue-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Main Container Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 w-full">

        {/* Hero Section */}
        <section className="text-center py-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold mb-4">
            <Sparkles size={11} className="text-emerald-600 animate-pulse" /> Flexible Subscription Plans
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            Scale Cleaning, Accelerate <span className="text-emerald-600">Analytics</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto font-medium">
            Unlock priority processing capacity, detailed machine learning insights, and interactive simulators.
          </p>
        </section>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
          {/* Billing cycle toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`relative px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  cycle === c
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {c === "yearly" ? "Yearly" : "Monthly"}
                {c === "yearly" && (
                  <span className="absolute -top-2.5 -right-2.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                    -{YEARLY_SAVING_PCT}%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Currency switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyDropdown((p) => !p)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm hover:border-emerald-500 dark:hover:border-emerald-800 transition-colors cursor-pointer"
            >
              {loadingRates ? <Loader2 size={13} className="animate-spin" /> : (
                <span className="text-base leading-none">{CURRENCIES[currency].symbol}</span>
              )}
              {currency}
              <ChevronDown size={13} />
            </button>

            {showCurrencyDropdown && (
              <div className="absolute top-full mt-1.5 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden min-w-[180px]">
                {(Object.entries(CURRENCIES) as [Currency, CurrencyMeta][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => { setCurrency(key); setShowCurrencyDropdown(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left transition-colors hover:bg-slate-105 dark:hover:bg-slate-800 cursor-pointer ${
                      currency === key ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="text-base w-5 text-center">{meta.symbol}</span>
                    {meta.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unified Cards Grid */}
        <main className="max-w-6xl mx-auto w-full flex flex-col gap-12">
          
          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Free Plan Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center">
                    <User size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Free</h2>
                    <p className="text-[11px] text-slate-400">1 user · Basic sandbox</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {CURRENCIES[currency].symbol}0
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/{cycle === "monthly" ? "mo" : "yr"}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Get started standardizing small tables, removing duplicates, and imputing columns.
                </p>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors shadow-inner text-center cursor-pointer"
                >
                  Continue Free
                </button>
              </div>
            </div>

            {/* Plus Plan Card */}
            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative">
              <div className="absolute -top-3.5 right-6 bg-emerald-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                Popular
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-center">
                    <Zap size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Plus</h2>
                    <p className="text-[11px] text-slate-400">1 user · Dedicated scale</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {CURRENCIES[currency].symbol}{formatPriceDigits(getPriceInr("plus"))}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/{cycle === "monthly" ? "mo" : "yr"}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  For active developers needing larger data queues, ML recommendations, and explanations.
                </p>
              </div>

              <div className="mt-8">
                <RazorpayCheckout
                  amount={getPriceInr("plus")}
                  currency={currency}
                  plan="plus"
                  cycle={cycle}
                  tierKey={TIER_KEYS["plus"][cycle]}
                  onSuccess={(paymentId) => handlePaymentSuccess("plus", paymentId)}
                  onFailure={handlePaymentFailure}
                  disabled={!isAuthenticated}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
                >
                  Subscribe Plus
                </RazorpayCheckout>
              </div>
            </div>

            {/* Pro Plan Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950 border border-blue-105 dark:border-blue-900/30 rounded-xl flex items-center justify-center">
                    <Building2 size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Pro</h2>
                    <p className="text-[11px] text-slate-400">10 seats · Corporate team</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {CURRENCIES[currency].symbol}{formatPriceDigits(getPriceInr("pro"))}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/{cycle === "monthly" ? "mo" : "yr"}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  High capacity workflows for corporate teams with team member seat delegation and priority support.
                </p>
              </div>

              <div className="mt-8">
                <RazorpayCheckout
                  amount={getPriceInr("pro")}
                  currency={currency}
                  plan="pro"
                  cycle={cycle}
                  tierKey={TIER_KEYS["pro"][cycle]}
                  onSuccess={(paymentId) => handlePaymentSuccess("pro", paymentId)}
                  onFailure={handlePaymentFailure}
                  disabled={!isAuthenticated}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-md transition-all cursor-pointer"
                >
                  Subscribe Pro
                </RazorpayCheckout>
              </div>
            </div>

          </div>

          {/* Three-Tier Comparison Table Section */}
          <div className="space-y-4 mt-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">Compare Features</h3>
              <p className="text-xs text-slate-450 font-medium">Find the plan that matches your pipeline complexity.</p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-6 py-4">Features</th>
                      <th className="px-6 py-4 w-1/5 text-center">Free</th>
                      <th className="px-6 py-4 w-1/5 text-center">Plus</th>
                      <th className="px-6 py-4 w-1/5 text-center font-bold text-emerald-600 dark:text-emerald-400">Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_FEATURES.map((feature, idx) => (
                      <tr key={idx} className="border-b border-slate-150 dark:border-slate-850/50 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-bold text-sm">
                          {feature.name}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold">
                          {typeof feature.free === "boolean" ? (
                            feature.free ? (
                              <Check size={16} className="text-emerald-500 mx-auto" />
                            ) : (
                              <X size={16} className="text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">{feature.free}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold">
                          {typeof feature.plus === "boolean" ? (
                            feature.plus ? (
                              <Check size={16} className="text-emerald-500 mx-auto" />
                            ) : (
                              <X size={16} className="text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">{feature.plus}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold">
                          {typeof feature.pro === "boolean" ? (
                            feature.pro ? (
                              <Check size={16} className="text-emerald-600 mx-auto" />
                            ) : (
                              <X size={16} className="text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{feature.pro}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pricing Bottom note */}
          <div className="text-center pt-2 pb-6">
            <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-relaxed font-semibold">
              * Payments processed securely via Razorpay API. Test mode active: no real funds are debited.<br />
              All subscriptions subject to standard fair use guidelines.
            </p>
          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Dataset Cleaner. All rights reserved.</span>
            <span className="font-semibold text-slate-500">Razorpay · Next.js · FastAPI</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
