"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/hooks/useAuth";
import { 
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Download,
  Check,
  Loader2,
  Trash2
} from "lucide-react";

interface Toast {
  message: string;
  type: "success" | "error" | "info";
  id: number;
}

export default function UploadPage() {
  const { isAuthenticated, user } = useAuth();
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Cleaning strategy configuration
  const [missingStrategy, setMissingStrategy] = useState("none");
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [standardizeTypes, setStandardizeTypes] = useState(false);

  // Job processing state
  const [processingStatus, setProcessingStatus] = useState<"Idle" | "Processing" | "Completed" | "Failed">("Idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Dropzone file drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      addToast("Invalid file format. Only CSV files (.csv) are supported.", "error");
      return;
    }

    setFile(selectedFile);
    setJobId(null);
    setProcessingStatus("Idle");
    setUploadProgress(0);
    setErrorMessage(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"]
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "File upload failed.");
      }

      const result = await response.json();
      setUploadProgress(100);
      setJobId(result.job_id);
      addToast("File uploaded successfully. Ready to clean!", "success");
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      addToast(err.message || "An error occurred during file upload.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!jobId) return;
    setProcessingStatus("Processing");
    setErrorMessage(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const emailParam = user?.email ? `?user_email=${encodeURIComponent(user.email)}` : "";
      
      const response = await fetch(`${backendUrl}/api/process/${jobId}${emailParam}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missing_values: missingStrategy,
          remove_duplicates: removeDuplicates,
          standardize_types: standardizeTypes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start data cleaning.");
      }

      addToast("Cleaning job accepted. Starting background processing...", "info");
    } catch (err: any) {
      setProcessingStatus("Failed");
      setErrorMessage(err.message || "Failed to start cleaning.");
      addToast(err.message || "Error starting background processor.", "error");
    }
  };

  useEffect(() => {
    if (processingStatus !== "Processing" || !jobId) return;

    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${backendUrl}/api/status/${jobId}`);
        
        if (!response.ok) {
          throw new Error("Failed to check processing status.");
        }

        const data = await response.json();

        if (data.status === "Completed") {
          setProcessingStatus("Completed");
          addToast("Dataset cleaning finished successfully!", "success");
          clearInterval(pollInterval);
        } else if (data.status === "Failed") {
          setProcessingStatus("Failed");
          setErrorMessage(data.error || "Server processing failed.");
          addToast("Cleaning process failed.", "error");
          clearInterval(pollInterval);
        }
      } catch (err: any) {
        console.error(err);
      }
    };

    checkStatus();
    pollInterval = setInterval(checkStatus, 2000);

    return () => clearInterval(pollInterval);
  }, [processingStatus, jobId]);

  const handleDownload = () => {
    if (!jobId) return;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
    window.open(`${backendUrl}/api/download/${jobId}`, "_blank");
  };

  const handleReset = () => {
    setFile(null);
    setJobId(null);
    setUploadProgress(0);
    setProcessingStatus("Idle");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
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

      {/* Main Container Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col items-center">
        <div className="max-w-3xl w-full">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Dataset Cleaning Studio
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Upload a CSV file, apply custom data formatting strategies, and export clean datasets instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Left side: Upload card and control settings */}
            <div className="md:col-span-3 flex flex-col gap-6">
              
              {/* Dropzone/File Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                {!file ? (
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                      isDragActive
                        ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 scale-[1.01]"
                        : "border-slate-300 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-600 bg-white dark:bg-slate-900/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/20">
                      <UploadIcon size={20} className={isDragActive ? "animate-bounce" : ""} />
                    </div>
                    {isDragActive ? (
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Drop the CSV file here...</p>
                    ) : (
                      <>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Drag &amp; drop your CSV file</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">or click to browse from system explorer</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Selected File Details */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Size: {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      {!jobId && !uploading && (
                        <button className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer" onClick={handleReset} title="Remove file">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Upload progress & trigger */}
                    {!jobId && (
                      <div className="mt-5">
                        {uploading ? (
                          <div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                              <span>Uploading dataset...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-blue-600 rounded-full transition-all duration-100 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <button className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer" onClick={handleUpload}>
                            Upload File
                          </button>
                        )}
                      </div>
                    )}

                    {/* If Uploaded successfully */}
                    {jobId && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-4">
                        <Check size={14} /> File uploaded securely (Job ID: {jobId.substring(0, 8)}...)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Strategies Panel (Only visible once uploaded) */}
              <div 
                className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-all duration-300 ${
                  jobId ? "opacity-100" : "opacity-40 pointer-events-none"
                }`}
              >
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Cleaning Strategies</h3>
                
                {/* 1. Missing values */}
                <div className="space-y-1.5 mb-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Handle Missing (Null) Values</label>
                  <select 
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={missingStrategy}
                    onChange={(e) => setMissingStrategy(e.target.value)}
                  >
                    <option value="none">Ignore (Keep empty fields)</option>
                    <option value="drop">Drop Rows (Deletes rows with null values)</option>
                    <option value="mean">Fill with Mean (Numerical columns only)</option>
                    <option value="median">Fill with Median (Numerical columns only)</option>
                    <option value="mode">Fill with Mode (Most frequent values)</option>
                  </select>
                </div>

                {/* 2. Checkboxes */}
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={removeDuplicates}
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                    />
                    Detect and Remove Duplicate Rows
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={standardizeTypes}
                      onChange={(e) => setStandardizeTypes(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                    />
                    Trim Whitespaces &amp; Standardize Types
                  </label>
                </div>

                {/* Trigger Processing Button */}
                <button 
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 dark:shadow-none hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={processingStatus === "Processing"}
                  onClick={handleProcess}
                >
                  <Play size={12} className="w-4 h-4" /> Process Dataset
                </button>
              </div>

            </div>

            {/* Right side: Process status display panel */}
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between min-h-[300px]">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Job Console</h3>
                
                <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
                  {processingStatus === "Idle" && (
                    <div className="text-slate-400">
                      <FileSpreadsheet size={40} className="opacity-20 mb-4 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Console Awaiting File</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">Upload a CSV and click Process to see results here.</p>
                    </div>
                  )}

                  {processingStatus === "Processing" && (
                    <div>
                      <Loader2 className="animate-spin text-blue-600 mb-4 mx-auto" size={40} />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Cleaning in Progress...</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">Applying selected strategies in the background. Polling server every 2s.</p>
                    </div>
                  )}

                  {processingStatus === "Completed" && (
                    <div>
                      <CheckCircle size={40} className="text-emerald-500 mb-4 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Dataset Cleaned!</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-5 mx-auto">The file is processed successfully and ready for export.</p>
                      
                      <button className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer" onClick={handleDownload}>
                        <Download size={14} className="w-4 h-4" /> Download CSV
                      </button>

                      <button className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors mt-3 cursor-pointer" onClick={handleReset}>
                        Upload New File
                      </button>
                    </div>
                  )}

                  {processingStatus === "Failed" && (
                    <div>
                      <AlertTriangle size={40} className="text-rose-500 mb-4 mx-auto" />
                      <h4 className="text-xs font-bold text-rose-600 mb-1">Processing Failed</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 max-w-[200px] mx-auto">{errorMessage || "An unexpected error occurred during execution."}</p>
                      
                      <button className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer" onClick={handleProcess}>
                        <RefreshCw size={12} className="w-4 h-4" /> Try Processing Again
                      </button>
                    </div>
                  )}
                </div>

                {jobId && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 text-[10px] text-slate-400 dark:text-slate-500 space-y-1 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg">
                    <div className="flex justify-between">
                      <span>Session Status:</span>
                      <span className={`font-bold ${processingStatus === "Completed" ? "text-emerald-500" : processingStatus === "Failed" ? "text-rose-500" : "text-blue-500"}`}>
                        {processingStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Job ID:</span>
                      <span className="font-mono">{jobId.substring(0, 18)}...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400 transition-colors mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Dataset Cleaner. All rights reserved.</span>
          <span>Clean Engine: Python &amp; Pandas 2.2</span>
        </div>
      </footer>
    </div>
  );
}
