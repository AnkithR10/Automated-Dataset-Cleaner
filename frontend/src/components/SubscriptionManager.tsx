"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { Loader2, Crown, AlertTriangle, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";

interface SubscriptionManagerProps {
  quota: {
    is_active: boolean;
    tier_type: string;
    tier_display: string;
    monthly_uploads_used: number;
    quota_limit: number | null;
    is_paid: boolean;
    pending_cancellation?: boolean;
    discount_applied?: boolean;
    billing_cycle?: string;
    subscribed_at?: number;
  } | null;
  onRefresh: () => void;
}

export function SubscriptionManager({ quota, onRefresh }: SubscriptionManagerProps) {
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const getCycleRemainingProgress = () => {
    if (!quota || !quota.is_paid || !quota.billing_cycle || !quota.subscribed_at) return 0;
    const now = Date.now() / 1000;
    const start = quota.subscribed_at;
    const duration = quota.billing_cycle.toLowerCase() === "yearly" ? 365 * 24 * 3600 : 30 * 24 * 3600;
    const elapsed = now - start;
    const pct = Math.max(0, Math.min(100, Math.round((1 - (elapsed % duration) / duration) * 100)));
    return pct;
  };

  const surveyReasons = [
    "Too expensive",
    "Missing critical features",
    "Found a better alternative",
    "Only needed it temporarily",
    "Difficult to use / technical issues",
  ];

  const handleStartCancel = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSelectedReason("");
    setOtherReason("");
    setShowSurveyModal(true);
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setErrorMsg("Please select a reason before continuing.");
      return;
    }
    setErrorMsg("");
    setShowSurveyModal(false);
    setShowRetentionModal(true);
  };

  const handleAcceptDiscount = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await api.post("/api/billing/apply-discount");
      setSuccessMsg("Excellent choice! A 20% retention discount has been applied to your next billing cycle.");
      onRefresh();
      setShowRetentionModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to apply discount. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await api.post("/api/billing/cancel");
      setSuccessMsg("Your subscription has been canceled. You will retain access until the end of your billing cycle.");
      onRefresh();
      setShowRetentionModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to cancel subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!quota) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
      </div>
    );
  }

  const isPaid = quota.is_paid;
  const isPendingCancel = quota.pending_cancellation;
  const discountApplied = quota.discount_applied;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Crown size={18} className="text-emerald-500" /> Plan Subscription Status
          </h3>
          <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
            Manage your premium subscription plan, billing periods, and retention coupons.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-850 rounded-xl">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Plan</span>
          <span className="text-[16px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {quota.tier_display}
            {isPaid && <span className="px-2 py-0.5 bg-emerald-600/10 text-emerald-600 text-[9px] rounded-full font-black uppercase">Paid</span>}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Billing Cycle</span>
          {isPaid && quota.billing_cycle ? (
            <div className="space-y-1.5 w-full">
              <div className="flex justify-between items-center text-[16px] font-bold text-slate-800 dark:text-slate-200 capitalize">
                <span>{quota.billing_cycle}</span>
                <span className="text-[11px] text-slate-400 font-semibold">({getCycleRemainingProgress()}% left)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${getCycleRemainingProgress()}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 w-full">
              <div className="text-[16px] font-bold text-slate-800 dark:text-slate-200 capitalize">
                N/A
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden opacity-40">
                <div className="h-full bg-slate-400 w-0" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Subscription Status</span>
          <span className={`text-[16px] font-bold flex items-center gap-1.5 ${isPendingCancel ? "text-amber-500" : "text-emerald-500"}`}>
            {isPendingCancel ? "Pending Cancellation" : "Active"}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Retention Coupon</span>
          <span className="text-[16px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {discountApplied ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles size={12} /> 20% Discount
              </span>
            ) : (
              <span className="text-slate-450 font-medium italic">No discount</span>
            )}
          </span>
        </div>
      </div>

      {isPaid && !isPendingCancel ? (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartCancel}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer border border-rose-200/40"
          >
            Cancel Subscription
          </button>
        </div>
      ) : isPaid && isPendingCancel ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/35 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">Subscription is pending cancellation</h5>
            <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-1 font-semibold leading-relaxed">
              Your account will downgrade to the Free tier at the end of the current billing cycle. No further charges will be made.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl text-center">
          <p className="text-xs text-slate-450 dark:text-slate-550 font-bold">
            You are currently on a free account. No active payment profile exists to cancel.
          </p>
        </div>
      )}

      {/* STEP 1: Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={18} /> Cancellation Survey
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              We're sorry to see you go! To help us improve the platform, please tell us why you want to cancel your subscription:
            </p>

            {errorMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{errorMsg}</p>
            )}

            <form onSubmit={handleSurveySubmit} className="space-y-3">
              {surveyReasons.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2.5 p-2.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-350 transition-colors"
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {selectedReason === "Missing critical features" && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Which features are you missing?"
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-semibold"
                />
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STEP 2: Retention & Offer Modal */}
      {showRetentionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <Sparkles size={24} className="animate-pulse" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-sm font-black text-slate-905 dark:text-white">Stay and Save 20%!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                We'd love to have you keep clean workspace access. Save 20% on your next billing cycles if you choose to stay with us today!
              </p>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold text-center">{errorMsg}</p>
            )}

            <div className="flex flex-col gap-2.5 pt-3">
              <button
                onClick={handleAcceptDiscount}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:-translate-y-0.5"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <>Accept 20% Discount & Stay</>}
              </button>

              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <>No thanks, Cancel My Subscription</>}
              </button>

              <button
                type="button"
                onClick={() => setShowRetentionModal(false)}
                className="w-full py-2 text-xs font-bold text-slate-450 hover:text-slate-600 dark:hover:text-slate-350 text-center transition-all cursor-pointer"
              >
                Nevermind, Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
