"use client";

import React, { useState } from "react";
import { Trash2, ShieldCheck, History, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";

interface HistoryItem {
  jobId: string;
  filename: string;
  timestamp: string;
  metadata?: {
    rows: number;
    cols: number;
    target?: string;
  };
}

interface ActivityLogProps {
  historyList: HistoryItem[];
  activeJobId: string | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

export function ActivityLog({ historyList, activeJobId, onSelect, onClear }: ActivityLogProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleClearAll = () => {
    localStorage.removeItem("cleaner_history");
    onClear();
    setShowConfirmClear(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden transition-all duration-300">
      {/* Decorative background shape */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <h3 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" /> Privacy & Local Logs
          </h3>
          <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
            Manage your local caching footprint. Purging logs removes all historical metadata cached on this browser.
          </p>
        </div>

        {/* Encrypted & Secure Badge (Image 1) */}
        <div className="flex flex-col items-center justify-center border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest gap-0.5 ml-3 flex-shrink-0 shadow-sm animate-pulse-slow">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>AES-256</span>
          <span className="text-[8px] opacity-75">Encrypted</span>
        </div>
      </div>

      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3">
        <ShieldCheck className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" size={16} />
        <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
          <strong>Privacy Policy Commitment:</strong> Your data security is paramount. Processed spreadsheets are held in secure, transient memory buffers and deleted after processing. PURGE HISTORY below to completely delete local caches.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <History size={14} /> Historical Workspace Logs
        </h4>

        <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {historyList.length > 0 ? (
            historyList.map((item) => {
              const isActive = item.jobId === activeJobId;
              return (
                <div
                  key={item.jobId}
                  onClick={() => onSelect(item)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 text-xs ${
                    isActive
                      ? "border-emerald-600 bg-emerald-600/5 dark:bg-emerald-950/20"
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/20 hover:bg-white"
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <FileSpreadsheet size={16} className={isActive ? "text-emerald-500" : "text-slate-400"} />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[16px] font-bold text-slate-700 dark:text-slate-200 truncate">{item.filename}</h5>
                      <span className="text-[14px] leading-relaxed text-slate-400 dark:text-slate-500 block mt-0.5">
                        {item.timestamp} · {item.metadata ? `${item.metadata.rows} rows x ${item.metadata.cols} cols` : "N/A"}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="px-2 py-0.5 bg-emerald-600/10 text-emerald-600 text-[9px] rounded-full font-black uppercase">
                      Active
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-650 text-xs font-semibold">
              No recent processing logs found.
            </div>
          )}
        </div>
      </div>

      {historyList.length > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold">
            {historyList.length} cached records stored locally
          </span>
          <button
            onClick={() => setShowConfirmClear(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200/40"
          >
            <Trash2 size={13} /> Purge Privacy Footprint
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="text-rose-600" size={18} /> Confirm History Purge
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              Are you sure you want to delete all local history logs? This action is permanent and will clear all files and configuration contexts from this browser cache.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer animate-pulse-once"
              >
                Yes, Purge Caches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
