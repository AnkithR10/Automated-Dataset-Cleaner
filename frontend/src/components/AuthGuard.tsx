"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const isPublicPath = pathname === "/" || pathname === "/login";
      if (!user && !isPublicPath) {
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verifying session...</span>
      </div>
    );
  }

  // If user is null and trying to access a protected path, show blank/loading while redirecting
  const isPublicPath = pathname === "/" || pathname === "/login";
  if (!user && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
