"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  Activity,
  Users,
  DollarSign,
  Server,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  TrendingUp,
  Cpu,
  Database,
  Layers,
  X,
} from "lucide-react";

interface HealthData {
  server_status: string;
  uptime_human: string;
  uptime_seconds: number;
  environment: string;
  razorpay_mode: string;
  jobs: { total: number; active: number; completed: number; failed: number };
  billing: {
    total_users: number;
    active_paid_users: number;
    total_revenue_inr: number;
    tier_breakdown: Record<string, number>;
  };
}

interface OverrideState {
  email: string;
  loading: boolean;
  result: string | null;
  error: string | null;
}

interface FounderDashboardProps {
  onClose: () => void;
}

const BACKEND = process.env.NEXT_PUBLIC_API_URL as string;

export function FounderDashboard({ onClose }: FounderDashboardProps) {
  const { user, idToken } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"health" | "metrics" | "override">("health");

  const [override, setOverride] = useState<OverrideState>({
    email: "",
    loading: false,
    result: null,
    error: null,
  });

  const fetchHealth = useCallback(async () => {
    if (!idToken) return;
    const start = performance.now();
    try {
      setHealthError(null);
      const res = await fetch(`${BACKEND}/api/admin/health`, {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setHealth(data);
    } catch (e: any) {
      setHealthError(e.message || "Failed to reach API");
    } finally {
      setLoadingHealth(false);
    }
  }, [idToken]);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleOverride = async (isPremium: boolean) => {
    if (!override.email.trim() || !idToken) return;
    setOverride((p) => ({ ...p, loading: true, result: null, error: null }));
    try {
      const res = await fetch(`${BACKEND}/api/admin/override`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ email: override.email.trim(), is_premium: isPremium }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Override failed");
      setOverride((p) => ({
        ...p,
        loading: false,
        result: `${override.email} → ${isPremium ? "Premium GRANTED ✓" : "Premium REVOKED ✗"}`,
      }));
    } catch (e: any) {
      setOverride((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  const tabs = [
    { id: "health" as const, label: "System Health", icon: <Server size={14} /> },
    { id: "metrics" as const, label: "Revenue", icon: <TrendingUp size={14} /> },
    { id: "override" as const, label: "Override", icon: <UserCheck size={14} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="w-full bg-slate-950 dark:bg-black border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-900/20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-950/60 to-slate-950 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Shield size={16} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-amber-400 tracking-wide uppercase">Founder Mode</h2>
            <p className="text-[10px] text-amber-600/70 font-medium">Owner-exclusive control panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealth}
            className="p-1.5 text-amber-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loadingHealth ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-slate-800 px-6 gap-1 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeSection === tab.id
                ? "text-amber-400 border-amber-400 bg-amber-500/5"
                : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── SYSTEM HEALTH ── */}
        {activeSection === "health" && (
          <div>
            {loadingHealth ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={16} className="animate-spin" /> Connecting to API...
              </div>
            ) : healthError ? (
              <div className="flex items-center gap-2 text-rose-400 text-xs p-3 bg-rose-950/30 rounded-lg border border-rose-800/40">
                <AlertCircle size={14} /> {healthError}
              </div>
            ) : health ? (
              <div className="founder-grid">
                {[
                  {
                    label: "API Status",
                    value: health.server_status.toUpperCase(),
                    sub: `${latencyMs}ms latency`,
                    icon: <Activity size={16} className="text-emerald-400" />,
                    color: "emerald",
                  },
                  {
                    label: "Uptime",
                    value: health.uptime_human,
                    sub: health.environment,
                    icon: <Cpu size={16} className="text-indigo-400" />,
                    color: "indigo",
                  },
                  {
                    label: "Jobs Completed",
                    value: String(health.jobs?.completed ?? 0),
                    sub: `${health.jobs?.failed ?? 0} failed`,
                    icon: <CheckCircle2 size={16} className="text-amber-400" />,
                    color: "amber",
                  },
                  {
                    label: "Razorpay",
                    value: (health.razorpay_mode || "unknown").toUpperCase(),
                    sub: "Payment gateway",
                    icon: <Database size={16} className="text-purple-400" />,
                    color: "purple",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="founder-card bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {stat.icon}
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-normal break-words">{stat.label}</span>
                    </div>
                    <div className="text-base font-black text-white whitespace-normal break-all">{stat.value}</div>
                    <div className="text-[10px] text-slate-500 whitespace-normal break-words">{stat.sub}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* ── REVENUE METRICS ── */}
        {activeSection === "metrics" && (
          <div>
            {!health ? (
              <div className="text-slate-500 text-xs">No data yet — refresh system health first.</div>
            ) : (
              <div className="founder-grid">
                {[
                  {
                    label: "Total Users",
                    value: String(health.billing?.total_users ?? 0),
                    icon: <Users size={16} className="text-indigo-400" />,
                  },
                  {
                    label: "Paid Users",
                    value: String(health.billing?.active_paid_users ?? 0),
                    icon: <UserCheck size={16} className="text-emerald-400" />,
                  },
                  {
                    label: "Revenue (INR)",
                    value: `₹${(health.billing?.total_revenue_inr ?? 0).toLocaleString("en-IN")}`,
                    icon: <DollarSign size={16} className="text-amber-400" />,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="founder-card bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {stat.icon}
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-normal break-words">{stat.label}</span>
                    </div>
                    <div className="text-xl font-black text-white whitespace-normal break-all">{stat.value}</div>
                  </div>
                ))}

                {/* Tier breakdown */}
                {health.billing?.tier_breakdown && Object.keys(health.billing.tier_breakdown).length > 0 && (
                  <div className="col-span-full bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Layers size={14} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tier Breakdown</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(health.billing.tier_breakdown).map(([tier, count]) => (
                        <span
                          key={tier}
                          className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg whitespace-normal break-all"
                        >
                          {tier}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL OVERRIDE ── */}
        {activeSection === "override" && (
          <div className="max-w-md">
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Grant or revoke premium access for any user email. Changes are in-memory and reset on server restart.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="user@example.com"
                value={override.email}
                onChange={(e) => setOverride((p) => ({ ...p, email: e.target.value, result: null, error: null }))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleOverride(true)}
                  disabled={override.loading || !override.email.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {override.loading ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                  Grant Premium
                </button>
                <button
                  onClick={() => handleOverride(false)}
                  disabled={override.loading || !override.email.trim()}
                  className="flex-1 py-2.5 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {override.loading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                  Revoke Premium
                </button>
              </div>

              {override.result && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
                  <CheckCircle2 size={13} /> {override.result}
                </div>
              )}
              {override.error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs p-3 bg-rose-950/30 rounded-lg border border-rose-800/40">
                  <AlertCircle size={13} /> {override.error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
