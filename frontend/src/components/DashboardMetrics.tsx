"use client";

import React from "react";
import { Database, Activity, LayoutDashboard, Crown } from "lucide-react";

interface DashboardMetricsProps {
  datasetsCleaned: number;
  quotaLimit: number | null;
  isPremium: boolean;
  pipelineStatus?: string;
}

export function DashboardMetrics({ datasetsCleaned, quotaLimit, isPremium, pipelineStatus = "Ready for Ingestion" }: DashboardMetricsProps) {
  const usagePercentage = quotaLimit ? Math.min((datasetsCleaned / quotaLimit) * 100, 100) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Metric 1: Total Datasets Cleaned & Quota */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Monthly Utilization
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
              {datasetsCleaned}
              <span className="text-sm font-medium text-slate-400">
                / {isPremium ? "Unlimited" : quotaLimit || 5} Free Quota
              </span>
            </h3>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Database size={20} />
          </div>
        </div>
        {!isPremium && quotaLimit !== null && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Metric 2: Data Health Index */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Data Health Index
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
              98.4%
              <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                Clean
              </span>
            </h3>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <Activity size={20} />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Global average across recent models
        </p>
      </div>

      {/* Metric 3: Active Processing Pipeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Active Pipeline
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {pipelineStatus}
            </h3>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <LayoutDashboard size={20} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {pipelineStatus === "Processing..." && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${pipelineStatus === "Ready for Ingestion" ? "bg-slate-300 dark:bg-slate-600" : "bg-emerald-500"}`}></span>
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            {pipelineStatus === "Ready for Ingestion" ? "Awaiting dataset payload" : "Computing transformations"}
          </p>
        </div>
      </div>
    </div>
  );
}
