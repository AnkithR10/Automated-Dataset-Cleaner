"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

interface SearchContextType {
  searchText: string;
  setSearchText: (text: string) => void;
}

const SearchContext = createContext<SearchContextType>({
  searchText: "",
  setSearchText: () => {},
});

export const useDashboardSearch = () => useContext(SearchContext);

interface QuotaStatus {
  tier_display: string;
  monthly_uploads_used: number;
  quota_limit: number | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchText, setSearchText] = useState("");
  const { user, isAuthenticated } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      api.get("/api/billing/status")
        .then((res) => setQuota(res.data))
        .catch((err) => console.error("Layout failed to fetch quota", err));
    }
  }, [isAuthenticated, user?.email]);

  const uploadsUsed = quota?.monthly_uploads_used ?? 0;
  const quotaLimit = quota?.quota_limit;

  return (
    <SearchContext.Provider value={{ searchText, setSearchText }}>
      <div className="w-full min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
        
        {/* TOP HEADER: Gmail Search Bar Style */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300">
          {/* Left spacer for centering if needed, but since Sidebar handles left nav, we just margin-auto the search block */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 w-full max-w-2xl px-4">
              <div className="relative w-full shadow-sm rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search datasets, columns, or models..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-semibold placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* User Info & Quota Summary Badge */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {user?.displayName || user?.email?.split("@")[0].toUpperCase() || "User"}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                {quota?.tier_display || "Free Tier"} · {uploadsUsed}/{quotaLimit ?? "∞"} Uploads
              </span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-xs shadow-sm select-none">
              {user?.email ? user.email[0].toUpperCase() : "U"}
            </div>
          </div>
        </header>

        {/* PADDED WORKSPACE CONTAINER */}
        <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6 min-h-0">
          {children}
        </main>
        
      </div>
    </SearchContext.Provider>
  );
}
