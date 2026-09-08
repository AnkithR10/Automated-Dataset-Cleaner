"use client";

import React, { useEffect } from "react";
import { FounderDashboard } from "@/components/FounderDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { isAuthenticated, loading, isFounder } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isFounder)) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, isFounder, router]);

  if (loading || !isFounder) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Shield className="text-amber-500" size={28} /> Founder Admin Console
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              System-wide metrics and user control center.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        <FounderDashboard onClose={() => {}} />
      </div>
    </div>
  );
}
