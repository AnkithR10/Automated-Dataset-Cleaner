"use client";

import React from "react";
import { Upload, Loader2, History, FileSpreadsheet, Trash2, ArrowRight } from "lucide-react";
import { DropzoneState } from "react-dropzone";

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

interface DatasetWorkspaceProps {
  dropzone: DropzoneState;
  uploading: boolean;
  uploadProgress: number;
  filteredHistory: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onRemoveHistory: (e: React.MouseEvent, jobId: string) => void;
}

export function DatasetWorkspace({
  dropzone,
  uploading,
  uploadProgress,
  filteredHistory,
  onSelectHistory,
  onRemoveHistory
}: DatasetWorkspaceProps) {
  const { getRootProps, getInputProps, isDragActive } = dropzone;

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full gap-10 py-6">
      
      {/* Top Section: Dropzone & Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 shadow-sm ${
            isDragActive
              ? "border-emerald-500 bg-emerald-50/30 scale-[1.02]"
              : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white dark:bg-slate-900 dark:border-slate-800"
          }`}
        >
          <input {...getInputProps()} />
          <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            {uploading ? (
              <Loader2 className="animate-spin text-emerald-600" size={28} />
            ) : (
              <Upload size={28} />
            )}
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
            {uploading ? `Ingesting Data... ${uploadProgress}%` : "Drop your dataset here"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium max-w-xs mx-auto leading-relaxed">
            Upload a raw CSV or Excel file up to 25MB to begin the automated cleaning and enrichment process.
          </p>
          {!uploading && (
            <button className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors cursor-pointer">
              Browse Files
            </button>
          )}
        </div>

        {/* Data Pipeline Map */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col justify-center shadow-sm">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            Automated Pipeline
          </h4>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent dark:before:from-slate-800 dark:before:via-slate-800">
            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 group-[.is-active]:bg-emerald-600 group-[.is-active]:text-white z-10 transition-colors">
                1
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm transition-all group-[.is-active]:border-emerald-500/30 group-[.is-active]:bg-emerald-50/50 dark:group-[.is-active]:bg-emerald-900/10">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Ingestion</h5>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Schema detection & parsing.</p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                2
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Cleaning Heuristics</h5>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Imputation & standardizing.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                3
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Export Ready</h5>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Clean CSV & ML metadata.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Logs List */}
      <div className="w-full space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 px-2">
          <History size={16} className="text-slate-400" /> Recent Processing Logs
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <div
                key={item.jobId}
                onClick={() => onSelectHistory(item)}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md rounded-2xl cursor-pointer transition-all duration-200 group flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 transition-colors">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.filename}</h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">{item.timestamp}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => onRemoveHistory(e, item.jobId)}
                  className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete log entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-1 sm:col-span-2 md:col-span-3 text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No historical logs found. Start by uploading a dataset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
