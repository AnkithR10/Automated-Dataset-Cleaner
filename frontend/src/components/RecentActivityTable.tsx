"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, CheckCircle, Clock, Trash2, ArrowRight } from "lucide-react";

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

interface RecentActivityTableProps {
  historyList: HistoryItem[];
  activeJobId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDownload: (jobId: string, filename: string) => void;
}

export function RecentActivityTable({
  historyList,
  activeJobId,
  onSelect,
  onDownload,
}: RecentActivityTableProps) {
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

  const handleDownloadClick = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setDownloadingJobId(item.jobId);
    try {
      await onDownload(item.jobId, item.filename);
    } finally {
      setDownloadingJobId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300">
      <div className="space-y-1">
        <h3 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-emerald-500" /> Recent Activity Log
        </h3>
        <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
          Detailed history log of completed dataset operations. Click on a row to active context.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider text-[11px]">
              <th className="px-5 py-3">Task Name</th>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {historyList.length > 0 ? (
              historyList.map((item) => {
                const isActive = item.jobId === activeJobId;
                return (
                  <tr
                    key={item.jobId}
                    onClick={() => onSelect(item)}
                    className={`border-b border-slate-100 dark:border-slate-850 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-850/35 cursor-pointer transition-colors ${
                      isActive ? "bg-emerald-500/5 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 text-[14px]">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet
                          size={16}
                          className={isActive ? "text-emerald-500" : "text-slate-400"}
                        />
                        <div className="min-w-0">
                          <span className="block truncate font-bold" title={item.filename}>
                            {item.filename}
                          </span>
                          {item.metadata && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-semibold">
                              {item.metadata.rows} rows x {item.metadata.cols} columns
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-[14px]">
                      {item.timestamp}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20">
                        <CheckCircle size={10} /> Completed
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isActive && (
                          <span className="px-2 py-0.5 bg-emerald-600/10 text-emerald-600 text-[9px] rounded-full font-black uppercase mr-2 tracking-widest">
                            Active Context
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDownloadClick(e, item)}
                          disabled={downloadingJobId === item.jobId}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download size={12} />
                          {downloadingJobId === item.jobId ? "Loading..." : "Download"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400 dark:text-slate-550 text-sm font-semibold">
                  No recent activity found. Upload and clean a dataset to generate historical log files.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
