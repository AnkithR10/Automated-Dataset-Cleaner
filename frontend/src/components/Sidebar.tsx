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
  MoreVertical,
  Trash2
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
  const [historyList, setHistoryList] = useState<any[]>([]);

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

  // Read local history on mount and listen to changes if possible
  useEffect(() => {
    const loadHistory = () => {
      const saved = localStorage.getItem("cleaner_history");
      if (saved) {
        try {
          setHistoryList(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load history in sidebar", e);
        }
      } else {
        setHistoryList([]);
      }
    };
    loadHistory();
    window.addEventListener("storage", loadHistory);
    return () => window.removeEventListener("storage", loadHistory);
  }, [pathname]); // Reload when pathname changes (e.g. going to dashboard)

  const handleRemoveHistory = (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = localStorage.getItem("cleaner_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const updated = parsed.filter((item: any) => item.jobId !== jobId);
        localStorage.setItem("cleaner_history", JSON.stringify(updated));
        setHistoryList(updated);
        window.dispatchEvent(new Event("storage"));
      } catch (err) {}
    }
  };

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
            {historyList.map((item) => (
              <div
                key={item.jobId}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}
                title={item.filename}
              >
                <Link href="/dashboard" className="flex items-center gap-3 min-w-0 flex-1">
                  <MessageSquare size={18} className="text-slate-400 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.filename}</span>}
                </Link>
                {!isCollapsed && (
                  <button
                    onClick={(e) => handleRemoveHistory(e, item.jobId)}
                    className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {historyList.length === 0 && !isCollapsed && (
              <div className="text-xs text-slate-400 px-2 py-4 italic">No recent datasets</div>
            )}
          </nav>
        </div>

        {/* Bottom: Profile & Settings */}
        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
          {!loading && isAuthenticated && (
            <div className="flex flex-col gap-2">
              <div 
                onClick={() => setShowSettings(true)}
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer group ${isCollapsed ? 'justify-center' : ''}`}
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                  {user?.displayName ? user.displayName[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "U"}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                        {user?.displayName || user?.email?.split("@")[0].toUpperCase() || "User"}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {userData?.planTier || "Free"}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); logout(); }}
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
                {historyList.map((item) => (
                  <div
                    key={item.jobId}
                    className="flex items-center justify-between p-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <MessageSquare size={18} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{item.filename}</span>
                    </Link>
                    <button
                      onClick={(e) => handleRemoveHistory(e, item.jobId)}
                      className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {historyList.length === 0 && (
                  <div className="text-xs text-slate-400 px-2 py-4 italic">No recent datasets</div>
                )}
              </nav>
            </div>

            {isAuthenticated && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-3 mt-auto">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}>
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
