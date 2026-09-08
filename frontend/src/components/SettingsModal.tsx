import React from "react";
import { X, CreditCard, Settings as SettingsIcon, Shield, Moon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  quota: any;
}

export function SettingsModal({ isOpen, onClose, user, quota }: SettingsModalProps) {
  const [activeTab, setActiveTab] = React.useState("account");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
        {/* Modal Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 px-2">Settings</h2>
          
          <button 
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "account" 
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CreditCard size={18} /> Account & Subscription
          </button>

          <button 
            onClick={() => setActiveTab("theme")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "theme" 
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Moon size={18} /> Theme
          </button>

          <button 
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "privacy" 
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Shield size={18} /> Privacy
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {activeTab === "account" && "Account & Subscription"}
              {activeTab === "theme" && "Theme Settings"}
              {activeTab === "privacy" && "Privacy Controls"}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          {activeTab === "account" && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 mb-1">Logged in as</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{user?.email}</p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-blue-800 dark:text-blue-300">Current Plan</p>
                  <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {quota?.tier_display || "Free Tier"}
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  {quota?.monthly_uploads_used ?? 0} / {quota?.quota_limit ?? 5} monthly uploads used.
                </p>
                <Link href="/pricing" onClick={onClose} className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors">
                  Manage Subscription
                </Link>
              </div>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400">Choose your preferred appearance.</p>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100">Toggle Theme</span>
                <ThemeToggle />
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400">Manage your local data and logs.</p>
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800">
                <h4 className="font-bold text-rose-800 dark:text-rose-300 mb-2">Clear Local Data</h4>
                <p className="text-sm text-rose-700 dark:text-rose-400 mb-4">
                  This will clear all local workspace logs and cached datasets from your browser.
                </p>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert("Local data cleared successfully.");
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Clear Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
