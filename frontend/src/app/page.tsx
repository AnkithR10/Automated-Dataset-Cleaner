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
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
  BarChart,
  Play
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
      console.error("Firebase Auth Error Code:", err?.code);
      console.error("Firebase Auth Error Message:", err?.message);
      let errorMessage = "Authentication failed. Please try again.";
      if (err?.code === "auth/popup-closed-by-user") errorMessage = "Sign-in cancelled.";
      else if (err?.code === "auth/unauthorized-domain") errorMessage = "This domain is not authorized for Google Sign-In.";
      else if (err?.code === "auth/network-request-failed") errorMessage = "Network error. Please check your connection.";
      addToast(errorMessage, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auto-redirect to dashboard if coming back from an OAuth redirect flow
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

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

  useEffect(() => {
    const mock = searchParams.get("mock");
    if (mock === "admin") handleDeveloperLogin("ankith.ravishankar@gmail.com");
    else if (mock === "user") handleDeveloperLogin("developer@example.com");
  }, [searchParams]);

  const authModal = showAuthModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
        <button 
          onClick={() => setShowAuthModal(false)}
          className="absolute -top-10 right-0 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors cursor-pointer"
        >
          ✕
        </button>
        <LoginCard onGoogleLogin={handleGoogleLogin} isLoading={authLoading} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-sans flex flex-col justify-between transition-colors duration-300 overflow-x-hidden">
      
      {authModal}

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

      <main className="mx-auto w-full flex-1 flex flex-col items-center">
        
        {/* HERO SECTION */}
        <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center relative animate-fade-in">
          
          {/* Glowing Accents */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-64 bg-gradient-to-r from-emerald-600/20 to-teal-500/20 rounded-[100%] blur-[100px] pointer-events-none" />
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold mb-8 shadow-sm relative z-10 animate-bounce">
            <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" /> Enterprise Analytics Ready
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6 relative z-10 max-w-4xl">
            Clean and prepare data in <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">seconds, not hours.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed mb-10 relative z-10">
            Automate duplicate removal, missing value imputation, and schema standardization. Generate actionable ML insights with explainable AI instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center w-full max-w-md relative z-10">
            {isAuthenticated ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full px-6 py-4 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-1"
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full px-6 py-4 text-base font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 text-slate-800 dark:text-white transition-all flex items-center justify-center gap-3 cursor-pointer hover:-translate-y-1 group"
              >
                {authLoading ? (
                  "Loading..."
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign In / Sign Up with Google
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* PRODUCT DEMONSTRATION MOCK */}
        <section className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 mb-24 relative z-10 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            
            <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-950 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                  <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <div className="h-2 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <div className="h-2 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
              <button className="mt-4 w-full py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                <Play size={14} className="fill-white" /> Run Pipeline
              </button>
            </div>

            <div className="w-full md:w-2/3 p-6 flex flex-col gap-4 bg-white dark:bg-slate-900 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <BarChart size={80} className="text-emerald-500/20" strokeWidth={1} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={30} className="text-emerald-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <div className="h-6 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
                <div className="h-6 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
                <div className="h-6 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
                <div className="h-6 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-2 w-full">
                  <div className="h-8 w-1/4 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-100 dark:border-slate-800"></div>
                  <div className="h-8 w-1/4 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-100 dark:border-slate-800"></div>
                  <div className="h-8 w-1/4 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-100 dark:border-slate-800"></div>
                  <div className="h-8 w-1/4 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-100 dark:border-slate-800"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-24 text-left">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Core Engines</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Four powerful tools bundled into one seamless data pipeline.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-emerald-600/10 hover:-translate-y-2 transition-all duration-300">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Layers size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Automated Deduplication</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Scan spreadsheet rows to detect and remove identical records automatically, keeping unique values strictly intact.
              </p>
            </div>

            <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-emerald-600/10 hover:-translate-y-2 transition-all duration-300">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Database size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Missing Values</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Intelligently impute null fields by automatically computing column averages or safely drop corrupted records entirely.
              </p>
            </div>

            <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-emerald-600/10 hover:-translate-y-2 transition-all duration-300">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Columns size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Schema Standardization</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Convert messy header labels (spaces, brackets, caps) into clean, lowercase snake_case for easy database ingest.
              </p>
            </div>

            <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-emerald-600/10 hover:-translate-y-2 transition-all duration-300">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <BrainCircuit size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">ML Recommendations</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Automated model suggestions with deep explainable insights (XAI) algorithms natively baked into the pipeline.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-center text-sm text-slate-400 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-medium">&copy; {new Date().getFullYear()} Dataset Cleaner. All rights reserved.</span>
          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Operational Systems Online
          </span>
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
