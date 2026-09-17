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
      const publicPaths = ["/", "/login", "/pricing"];
      const isPublicPath = publicPaths.includes(pathname);
      
      if (!user && !isPublicPath) {
        router.replace("/"); // Redirect to landing instead of /login to prevent loops if /login doesn't exist
      } else if (user && (pathname === "/" || pathname === "/login")) {
        router.replace("/dashboard");
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
  const publicPaths = ["/", "/login", "/pricing"];
  const isPublicPath = publicPaths.includes(pathname);
  if (!user && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
