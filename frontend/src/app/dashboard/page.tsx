"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { MLInsights } from "@/components/MLInsights";
import { ActivityLog } from "@/components/ActivityLog";
import { WorkflowVisualizer } from "@/components/WorkflowVisualizer";
import { RecentActivityTable } from "@/components/RecentActivityTable";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { DatasetWorkspace } from "@/components/DatasetWorkspace";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardSearch } from "./layout";
import api from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Settings2,
  History,
  Trash2,
  Loader2,
  Columns,
  Layers,
  Sparkles,
  Database,
  Crown,
  Info,
  ExternalLink,
  Table,
  Plus,
  Search,
  Settings,
  HelpCircle,
  Shield,
  Terminal,
  TrendingUp
} from "lucide-react";

interface Toast {
  message: string;
  type: "success" | "error" | "info";
  id: number;
}

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

interface QuotaStatus {
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
}

export default function DashboardPage() {
  const { isAuthenticated, user, loading, logout, isPremium } = useAuth();
  const router = useRouter();

  // Active dataset state
  const [jobId, setJobId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [datasetMetadata, setDatasetMetadata] = useState<{
    rows: number;
    cols: number;
    target: string;
  } | null>(null);

  // File preview for preview modal
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Cleaning strategy options
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [missingStrategy, setMissingStrategy] = useState("mean"); // "mean", "drop", "none"
  const [standardizeColumnNames, setStandardizeColumnNames] = useState(true);

  // Status & loader states
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // UI state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  // Trigger 80% quota upsell alert modal for Free tier
  useEffect(() => {
    if (quota && !quota.is_paid && quota.quota_limit) {
      const pct = quota.monthly_uploads_used / quota.quota_limit;
      if (pct >= 0.8) {
        setShowUpsellModal(true);
      }
    }
  }, [quota]);

  // Search input context (Gmail search aesthetic)
  const { searchText } = useDashboardSearch();

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Protected Route Check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/");
    }
  }, [loading, isAuthenticated, router]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("cleaner_history");
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // (Founder mode listener removed)

  // Fetch quota
  const fetchQuota = useCallback(async () => {
    if (!user?.email) return;
    setLoadingQuota(true);
    try {
      const res = await api.get(`/api/billing/status`);
      setQuota(res.data);
    } catch (e) {
      console.error("Failed to fetch quota", e);
    } finally {
      setLoadingQuota(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchQuota();
    }
  }, [isAuthenticated, user?.email, fetchQuota]);

  // Drag and drop CSV
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      addToast("Invalid file format. Please upload a .csv file.", "error");
      return;
    }

    handleUploadFile(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"]
    },
    multiple: false
  });

  // Handle uploading CSV
  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 80);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const result = res.data;
      setJobId(result.job_id);
      setActiveFilename(result.filename);
      setPreviewColumns(result.preview_columns || []);
      setPreviewRows(result.preview_rows || []);
      
      // Update local state metadata
      const initialMeta = {
        rows: result.preview_rows.length,
        cols: result.preview_columns.length,
        target: result.preview_columns.length > 0 ? result.preview_columns[result.preview_columns.length - 1] : "target"
      };
      setDatasetMetadata(initialMeta);

      // Append to history list
      const newItem: HistoryItem = {
        jobId: result.job_id,
        filename: result.filename,
        timestamp: new Date().toLocaleString(),
        metadata: initialMeta
      };
      setHistoryList((prev) => {
        const updated = [newItem, ...prev.filter(item => item.jobId !== result.job_id).slice(0, 9)];
        localStorage.setItem("cleaner_history", JSON.stringify(updated));
        return updated;
      });

      addToast("File loaded successfully. Configure strategies below.", "success");
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      addToast(err.response?.data?.detail || "An error occurred during file upload.", "error");
    } finally {
      setUploading(false);
    }
  };

  // Run cleaning process
  const handleClean = async () => {
    if (!jobId) return;
    setProcessing(true);
    setProcessingStatus("Queuing cleaning workers...");

    try {
      await api.post(`/api/process/${jobId}`, {
        missing_values: missingStrategy,
        remove_duplicates: removeDuplicates,
        standardize_column_names: standardizeColumnNames,
        standardize_types: true
      });

      setProcessingStatus("Standardizing schemas & imputing empty values...");
      
      // Start polling status
      pollStatus();
    } catch (err: any) {
      setProcessing(false);
      setProcessingStatus(null);
      addToast(err.response?.data?.detail || "Could not start cleaning process.", "error");
    }
  };

  // Poll job status until complete
  const pollStatus = () => {
    let interval = setInterval(async () => {
      if (!jobId) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await api.get(`/api/status/${jobId}`);
        const status = res.data.status;
        
        if (status === "Completed") {
          clearInterval(interval);
          setProcessing(false);
          setProcessingStatus(null);
          addToast("Dataset cleaned successfully!", "success");
          fetchQuota(); // Refresh uploads used quota

          // Update metadata details based on computed shapes
          const xai = res.data.xai_insights;
          if (xai) {
            const updatedMeta = {
              rows: xai.num_rows || datasetMetadata?.rows || 100,
              cols: xai.num_cols || datasetMetadata?.cols || 10,
              target: xai.target_column || datasetMetadata?.target || "target"
            };
            setDatasetMetadata(updatedMeta);
          }
        } else if (status === "Failed") {
          clearInterval(interval);
          setProcessing(false);
          setProcessingStatus(null);
          addToast(res.data.error || "Dataset cleaning failed.", "error");
        }
      } catch (err) {
        console.error("Status check failed", err);
      }
    }, 2000);
  };

  // Select dataset from history
  const handleSelectHistoryDataset = async (item: HistoryItem) => {
    setJobId(item.jobId);
    setActiveFilename(item.filename);
    if (item.metadata) {
      setDatasetMetadata({
        rows: item.metadata.rows,
        cols: item.metadata.cols,
        target: item.metadata.target || "target"
      });
    } else {
      setDatasetMetadata(null);
    }
    
    // Fetch preview columns and rows
    try {
      const res = await api.get(`/api/status/${item.jobId}`);
      if (res.data.status === "Completed") {
        setDatasetMetadata({
          rows: res.data.xai_insights?.num_rows || item.metadata?.rows || 100,
          cols: res.data.xai_insights?.num_cols || item.metadata?.cols || 10,
          target: res.data.xai_insights?.target_column || item.metadata?.target || "target"
        });
      }
      addToast(`Switched active context to ${item.filename}`, "info");
    } catch (err) {
      addToast(`Switched active context to ${item.filename}`, "info");
    }
  };

  // Remove history dataset
  const handleRemoveHistoryDataset = (e: React.MouseEvent, histJobId: string) => {
    e.stopPropagation();
    setHistoryList((prev) => {
      const updated = prev.filter((item) => item.jobId !== histJobId);
      localStorage.setItem("cleaner_history", JSON.stringify(updated));
      return updated;
    });
    if (jobId === histJobId) {
      handleResetWorkspace();
    }
    addToast("History record deleted.", "info");
  };

  // Reset workspace
  const handleResetWorkspace = () => {
    setJobId(null);
    setActiveFilename(null);
    setDatasetMetadata(null);
    setPreviewColumns([]);
    setPreviewRows([]);
    setProcessing(false);
    setProcessingStatus(null);
  };

  // Secure Axios Download as Blob
  const handleDownloadCleaned = async () => {
    if (!jobId) return;
    try {
      addToast("Preparing secure download...", "info");
      const res = await api.get(`/api/download/${jobId}`, {
        responseType: "blob"
      });
      
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const downloadName = activeFilename 
        ? `${activeFilename.replace(/\.csv$/i, "")}_cleaned.csv`
        : "cleaned_dataset.csv";
      link.setAttribute("download", downloadName);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addToast("Cleaned CSV downloaded successfully.", "success");
    } catch (err: any) {
      console.error(err);
      addToast("Failed to secure download cleaned CSV.", "error");
    }
  };

  const handleDownloadCleanedForJobId = async (histJobId: string, filename: string) => {
    try {
      addToast("Preparing secure download...", "info");
      const res = await api.get(`/api/download/${histJobId}`, {
        responseType: "blob"
      });
      
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const downloadName = filename.toLowerCase().endsWith(".csv")
        ? filename.replace(/\.csv$/i, "_cleaned.csv")
        : `${filename}_cleaned.csv`;
      link.setAttribute("download", downloadName);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addToast("Cleaned CSV downloaded successfully.", "success");
    } catch (err: any) {
      console.error(err);
      addToast("Failed to secure download cleaned CSV.", "error");
    }
  };

  // Filter history logs based on search text
  const filteredHistory = useMemo(() => {
    if (!searchText.trim()) return historyList;
    return historyList.filter(item => 
      item.filename.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [historyList, searchText]);

  // Quota Metrics
  const quotaLimit = quota?.quota_limit ?? 5;
  const uploadsUsed = quota?.monthly_uploads_used ?? 0;
  const isPlanPaid = quota?.is_paid ?? false;
  const quotaPct = Math.min(100, Math.round((uploadsUsed / quotaLimit) * 100));

  // Render workspace content helper
  const renderWorkspace = () => {
    if (!jobId) {
      return (
        <DatasetWorkspace
          dropzone={{ getRootProps, getInputProps, isDragActive, open }}
          uploading={uploading}
          uploadProgress={uploadProgress}
          filteredHistory={filteredHistory}
          onSelectHistory={handleSelectHistoryDataset}
          onRemoveHistory={handleRemoveHistoryDataset}
        />
      );
    }

    return (
      <div className="flex flex-col gap-6">
        {/* Top active bar */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{activeFilename}</h2>
              <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                Columns: {datasetMetadata?.cols || 0} · Rows: {datasetMetadata?.rows || 10} · Default Target: <strong>{datasetMetadata?.target || "target"}</strong>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadCleaned}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download size={13} /> Secure Download Cleaned
            </button>
            <button
              onClick={handleResetWorkspace}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all cursor-pointer"
            >
              Reset Workspace
            </button>
          </div>
        </div>

        {/* Grid Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5/12 width): Configuration & Preview */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Configuration Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
                <Settings2 size={16} className="text-emerald-600" /> Cleaning Configuration
              </h3>

              <div className="space-y-4">
                {/* Duplicates toggle */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-2.5">
                    <Layers className="text-slate-400 mt-0.5" size={15} />
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">Remove Duplicates</label>
                      <span className="text-[10px] text-slate-400 block font-semibold">Exclude redundant records</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Columns headers toggle */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-2.5">
                    <Columns className="text-slate-400 mt-0.5" size={15} />
                    <div>
                      <label className="text-xs font-bold text-slate-705 block">Standardize Columns</label>
                      <span className="text-[10px] text-slate-400 block font-semibold">Lowercase snake_case headers</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={standardizeColumnNames}
                    onChange={(e) => setStandardizeColumnNames(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Imputation dropdown */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-705">Handle Empty Cells (Imputation)</label>
                  <select
                    value={missingStrategy}
                    onChange={(e) => setMissingStrategy(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  >
                    <option value="none">Keep empty records (Ignore)</option>
                    <option value="drop">Drop rows with empty cells</option>
                    <option value="mean">Impute Mean (average columns)</option>
                  </select>
                </div>

                {/* Cleaning trigger */}
                <div className="pt-2">
                  <button
                    onClick={handleClean}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> {processingStatus || "Processing..."}
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-white" /> Clean Dataset Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabular Preview Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Table size={16} className="text-slate-500" /> Parsed Dataset Preview
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                  {previewRows.length} Rows Shown
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-auto max-h-64 shadow-inner">
                {previewColumns.length > 0 ? (
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 font-semibold text-slate-500">
                      <tr>
                        {previewColumns.map((colName) => (
                          <th key={colName} className="px-3 py-1.5 border-r border-slate-200 last:border-r-0 uppercase tracking-wider">
                            {colName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                          {previewColumns.map((colName) => (
                            <td key={colName} className="px-3 py-2 border-r border-slate-100 last:border-r-0 max-w-[120px] truncate text-slate-600 font-medium">
                              {row[colName] !== null ? String(row[colName]) : <span className="text-slate-300 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No active dataset preview.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (7/12 width): Suggestions & Insights Panel */}
          <div className="lg:col-span-7">
            <MLInsights
              jobId={jobId}
              filename={activeFilename || "dataset.csv"}
              numRows={datasetMetadata?.rows || 100}
              numCols={datasetMetadata?.cols || 10}
              targetColumn={datasetMetadata?.target || "target"}
              userPlan={quota?.tier_type || "individual_free"}
            />
          </div>

        </div>

      </div>
    );
  };

  return (
    <>
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm flex items-center gap-2 transform transition-all duration-300 translate-y-0 opacity-100 ${
              toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-blue-600"
            }`}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
        
      <div className="space-y-6 pb-8">
        <DashboardMetrics 
          datasetsCleaned={uploadsUsed}
          quotaLimit={quotaLimit}
          isPremium={isPremium}
          pipelineStatus={processing ? "Processing..." : "Ready for Ingestion"}
        />
        
        {!isPremium && (
          <div className="relative overflow-hidden p-6 bg-gradient-to-br from-emerald-900/90 to-emerald-800 dark:from-emerald-950/80 dark:to-emerald-900/60 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl shadow-emerald-900/10 backdrop-blur-md transition-all">
            {/* Glassmorphic decorative circles */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="h-12 w-12 bg-white/10 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner backdrop-blur-sm border border-white/20">
                <Crown size={24} className="animate-pulse drop-shadow-md" />
              </div>
              <div>
                <h4 className="font-black text-white text-base tracking-tight mb-1">
                  Unlock Pro Suggestions & Interactive Simulators
                </h4>
                <p className="text-xs text-emerald-50 max-w-2xl leading-relaxed font-medium">
                  You are currently on the Free plan. Upgrade to Plus or Pro for priority queues, XAI feature importance, and interactive model training simulators designed for elite enterprise teams.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/pricing")}
              className="relative z-10 px-6 py-3 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all whitespace-nowrap cursor-pointer hover:-translate-y-0.5 border border-emerald-100"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {renderWorkspace()}

        {/* WORKFLOW & ACTIVITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WorkflowVisualizer />
          <div className="dashboard-grid bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <ActivityLog
              historyList={historyList}
              activeJobId={jobId}
              onSelect={handleSelectHistoryDataset}
              onClear={() => {
                setHistoryList([]);
                handleResetWorkspace();
              }}
            />
          </div>
        </div>

        <RecentActivityTable
          historyList={historyList}
          activeJobId={jobId}
          onSelect={handleSelectHistoryDataset}
          onDownload={handleDownloadCleanedForJobId}
        />

        {/* PLAN & QUOTA FOOTER CARD */}
        <footer className="w-full pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Crown size={12} className="text-blue-500" /> Account Plan Tier
              </span>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {quota?.tier_display || "Free Plan"}
              </h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed">
                Your subscription limits monthly uploads and workspace member seat pools.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">
                Monthly Upload Quota
              </span>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{uploadsUsed} / {quotaLimit ?? "Unlimited"} used</span>
                <span>{quotaPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-400 dark:text-slate-500">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Info size={12} className="text-slate-450" /> Secure Encryption
              </span>
              <p className="leading-relaxed font-semibold">
                All backend endpoints require Firebase Authorization Token headers. Datasets are securely downloaded as client-side local blob buffers.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {showUpsellModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-hidden text-center relative space-y-4">
            <div className="mx-auto h-12 w-12 bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center">
              <Crown size={24} className="animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              You're running out of space!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              You've used {quota?.monthly_uploads_used} of your {quota?.quota_limit} free monthly uploads. Upgrade to Plus to get 10x more capacity and unlock advanced features.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUpsellModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowUpsellModal(false);
                  router.push("/pricing");
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
