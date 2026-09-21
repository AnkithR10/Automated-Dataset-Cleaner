import React from "react";
import { X, CreditCard, Shield, Moon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  quota: any;
}

export function SettingsModal({ isOpen, onClose, user, quota }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CreditCard size={22} className="text-blue-500" /> Subscription & Account
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-8">
          
          {/* Account Details */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={16} /> Account Details
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 mb-1">Logged in as</p>
              <p className="font-bold text-slate-800 dark:text-slate-100">{user?.email || "Unknown"}</p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-blue-800 dark:text-blue-300">Current Plan</p>
                <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold rounded-full">
                  {quota?.tier_display || "Free Tier"}
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-4 font-medium">
                {quota?.monthly_uploads_used ?? 0} / {quota?.quota_limit ?? 5} monthly uploads used.
              </p>
              <Link href="/pricing" onClick={onClose} className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition-colors shadow-sm">
                Manage Subscription
              </Link>
            </div>
          </section>

          {/* Theme Settings */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Moon size={16} /> Appearance
            </h4>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-0.5">Toggle Theme</p>
                <p className="text-xs text-slate-500">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {/* Privacy Controls */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Shield size={16} /> Privacy
            </h4>
            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-rose-800 dark:text-rose-400 text-sm mb-0.5">Clear Local Data</h4>
                <p className="text-xs text-rose-700 dark:text-rose-500 font-medium max-w-[250px]">
                  Clear workspace logs and cached datasets from your browser.
                </p>
              </div>
              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  alert("Local data cleared successfully.");
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                Clear Cache
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
