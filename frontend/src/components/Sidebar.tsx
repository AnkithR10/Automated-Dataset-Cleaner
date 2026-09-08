"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { SettingsModal } from "@/components/SettingsModal";
import api from "@/lib/api";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  Menu, 
  X, 
  LogOut, 
  Plus,
  MessageSquare,
  Settings,
  MoreVertical
} from "lucide-react";

export function Sidebar() {
  const { user, isAuthenticated, loading, logout, isPremium, isFounder } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quota, setQuota] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const hasPremium = userData?.isPremium ?? isPremium;

  useEffect(() => {
    if (isAuthenticated && user?.email && !isFounder) {
      api.get("/api/billing/status")
        .then((res) => setQuota(res.data))
        .catch((err) => console.error("Sidebar failed to fetch quota", err));
    }
  }, [isAuthenticated, user?.email, isFounder, pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setUserData(null);
      return;
    }
    if (user.uid.startsWith("mock_uid_")) {
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData(null);
      }
    }, (error) => {
      console.warn("Sidebar Firestore onSnapshot failed/bypassed:", error);
    });
    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  useEffect(() => {
    if (user?.uid?.startsWith("mock_uid_") && quota) {
      setUserData({
        planTier: quota.tier_display || (isPremium ? "Plus" : "Individual Free"),
        isPremium: quota.is_paid ?? isPremium,
        uploadsUsed: quota.monthly_uploads_used ?? 0,
        uploadLimit: quota.quota_limit ?? 5
      });
    }
  }, [quota, user?.uid, isPremium]);

  if (pathname === "/login" || pathname === "/") {
    return null;
  }

  // Dummy data for "Recent Datasets"
  const recentDatasets = [
    "Sales_Data_Q1.csv",
    "Customer_Churn.csv",
    "Marketing_Metrics.csv"
  ];

  return (
    <>
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        user={user}
        quota={quota || userData}
      />

      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-72'} border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hidden md:flex flex-col h-screen sticky top-0 left-0 flex-shrink-0 z-20 transition-all duration-300`}
      >
        <div className="flex items-center p-4">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Top: New Dataset Button */}
        <div className="px-4 mb-6">
          <Link 
            href="/dashboard"
            className={`flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl transition-all shadow-sm ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3'}`}
          >
            <Plus size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm">New Dataset</span>}
          </Link>
        </div>

        {/* Middle: Recent Datasets */}
        <div className="flex-1 overflow-y-auto px-4">
          {!isCollapsed && (
            <div className="mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Datasets
            </div>
          )}
          <nav className="space-y-1">
            {recentDatasets.map((dataset, idx) => (
              <Link
                key={idx}
                href="/dashboard"
                className={`flex items-center gap-3 p-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                title={dataset}
              >
                <MessageSquare size={18} className="text-slate-400 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{dataset}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom: Profile & Settings */}
        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
          {!loading && isAuthenticated && (
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowSettings(true)}
                className={`flex items-center gap-3 p-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                title="Settings"
              >
                <Settings size={20} className="text-slate-500" />
                {!isCollapsed && <span>Settings</span>}
              </button>

              <div className={`flex items-center gap-3 p-2 rounded-lg ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                  {user?.displayName ? user.displayName[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "U"}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {user?.displayName || user?.email?.split("@")[0].toUpperCase() || "User"}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {userData?.planTier || "Free"}
                      </span>
                    </div>
                    <button 
                      onClick={logout}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      title="Sign Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE TOP NAVBAR */}
      <header className="md:hidden sticky top-0 left-0 right-0 z-30 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 transition-colors duration-300">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600" />
          <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
            Dataset<span className="text-blue-600">Cleaner</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 transition-colors"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-20 md:hidden animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute top-16 left-0 right-0 bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-5 shadow-2xl flex flex-col gap-5 animate-slide-down overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Link 
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-2xl transition-all shadow-sm"
            >
              <Plus size={20} className="text-blue-600" />
              <span className="font-semibold text-sm">New Dataset</span>
            </Link>

            <div className="flex-1 overflow-y-auto">
              <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recent Datasets
              </div>
              <nav className="space-y-1">
                {recentDatasets.map((dataset, idx) => (
                  <Link
                    key={idx}
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <MessageSquare size={18} className="text-slate-400" />
                    <span className="truncate">{dataset}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {isAuthenticated && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-3 mt-auto">
                <button 
                  onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings size={20} className="text-slate-500" />
                  <span>Settings</span>
                </button>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {user?.displayName ? user.displayName[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "U"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {user?.displayName || user?.email?.split("@")[0].toUpperCase() || "User"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="text-slate-500 hover:text-rose-500">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
