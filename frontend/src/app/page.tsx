"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginCard } from "@/components/LoginCard";
import { 
  Layers, 
  ArrowRight, 
  Database, 
  Columns,
  Sparkles,
  BrainCircuit
} from "lucide-react";

interface Toast {
  message: string;
  type: "success" | "error" | "info";
  id: number;
}

function LandingPage() {
  const { isAuthenticated, signInWithGoogle, signInWithMock } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
      addToast("Successfully logged in with Google", "success");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Auth error:", err?.code, err?.message);
      
      let errorMessage = "Authentication failed. Please try again.";
      if (err?.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in cancelled.";
      } else if (err?.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized for Google Sign-In.";
      } else if (err?.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      addToast(errorMessage, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDeveloperLogin = async (email: string) => {
    setAuthLoading(true);
    try {
      await signInWithMock(email);
      setShowAuthModal(false);
      addToast("Successfully logged in as developer", "success");
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      addToast("Developer login failed", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle mock login query params
  useEffect(() => {
    const mock = searchParams.get("mock");
    if (mock === "admin") {
      handleDeveloperLogin("ankith.ravishankar@gmail.com");
    } else if (mock === "user") {
      handleDeveloperLogin("developer@example.com");
    }
  }, [searchParams]);

  const authModal = showAuthModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={() => setShowAuthModal(false)}
          className="absolute -top-10 right-0 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors cursor-pointer"
        >
          ✕
        </button>
        <LoginCard 
          onGoogleLogin={handleGoogleLogin} 
          isLoading={authLoading} 
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-sans flex flex-col justify-between transition-colors duration-300">
      
      {authModal}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
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

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col justify-center items-center w-full">
        <div className="max-w-4xl w-full text-center flex flex-col items-center">

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold mb-6 shadow-sm">
            <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" /> Version 2.0 Released
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-6">
            Automated <span className="text-emerald-600">Dataset Cleaner</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed mb-10">
            A production-ready data cleaning engine. Securely upload spreadsheets, automatically prune duplicates, impute missing columns, standardise schemas, and download clean datasets in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center w-full max-w-md">
            {isAuthenticated ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                >
                  Get Started (Free) <ArrowRight size={16} />
                </button>
                <a
                  href="#features"
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition-all flex items-center justify-center"
                >
                  Learn More
                </a>
              </>
            )}
          </div>

          {/* Feature Showcase Grid */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl text-left mt-4">

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                <Layers size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Remove Duplicates</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Scan spreadsheet rows to detect and remove identical records automatically, keeping unique values intact.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                <Database size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Handle Missing Values</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Impute null fields by automatically computing column averages (mean/median) or safely drop corrupted records.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                <Columns size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Standardize Columns</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Convert messy header labels (spaces, brackets, caps) into lowercase snake_case for easy database ingest.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                <BrainCircuit size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">ML Recommendations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automated model suggestions (Classification, Clustering, Regression) with explainable insights using XAI algorithms.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Dataset Cleaner. All rights reserved.</span>
          <span className="font-semibold text-slate-500 dark:text-slate-400">FastAPI backend &amp; Next.js dashboard</span>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
