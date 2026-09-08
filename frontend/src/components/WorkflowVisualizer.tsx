"use client";

import React from "react";
import { Sparkles, UploadCloud, FileSpreadsheet, Download } from "lucide-react";

export function WorkflowVisualizer() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-300">
      {/* Decorative background overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-500 animate-pulse" /> Data Pipeline Map
          </h3>
          <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
            Visualizing the secure parsing, imputation, and download pipeline.
          </p>
        </div>

        {/* Pipeline SVG Diagram */}
        <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-850 p-4 rounded-xl flex items-center justify-center min-h-[160px]">
          <svg className="w-full max-w-[280px]" viewBox="0 0 300 120" xmlns="http://www.w3.org/http/2000/svg">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <style>{`
                .flow-line {
                  stroke: url(#lineGrad);
                  stroke-width: 2.5;
                  stroke-dasharray: 6 4;
                  animation: dashMove 20s linear infinite;
                }
                @keyframes dashMove {
                  to {
                    stroke-dashoffset: -100;
                  }
                }
                .node-text {
                  font-family: inherit;
                  font-size: 10px;
                  font-weight: 700;
                  fill: #64748b;
                }
                .dark .node-text {
                  fill: #94a3b8;
                }
              `}</style>
            </defs>

            {/* Connecting lines */}
            <path d="M 50,55 L 150,55" className="flow-line" />
            <path d="M 150,55 L 250,55" className="flow-line" />

            {/* Node 1: Upload */}
            <g transform="translate(50, 55)">
              <circle r="20" fill="#f0fdf4" stroke="#10b981" strokeWidth="2" className="dark:fill-emerald-950/20" />
              <g transform="translate(-10,-10)">
                <UploadCloud size={20} className="text-emerald-600 dark:text-emerald-400" />
              </g>
              <text x="0" y="32" textAnchor="middle" className="node-text">1. Upload</text>
            </g>

            {/* Node 2: Clean */}
            <g transform="translate(150, 55)">
              <circle r="20" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" className="dark:fill-emerald-950/20" />
              <g transform="translate(-10,-10)">
                <FileSpreadsheet size={20} className="text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
              </g>
              <text x="0" y="32" textAnchor="middle" className="node-text">2. Process</text>
            </g>

            {/* Node 3: Download */}
            <g transform="translate(250, 55)">
              <circle r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" className="dark:fill-blue-950/20" />
              <g transform="translate(-10,-10)">
                <Download size={20} className="text-blue-600 dark:text-blue-400" />
              </g>
              <text x="0" y="32" textAnchor="middle" className="node-text">3. Download</text>
            </g>
          </svg>
        </div>
      </div>

      <div className="text-[12px] text-slate-450 dark:text-slate-500 font-bold leading-relaxed text-center pt-2">
        AES-256 secure transient pipeline. We store zero raw dataset buffers permanently.
      </div>
    </div>
  );
}
