"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginCard } from "@/components/LoginCard";

function LoginForm() {
  const { isAuthenticated, signInWithGoogle, signInWithMock } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Google Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDeveloperLogin = async (email: string) => {
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      await signInWithMock(email);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Developer bypass authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Handle mock login query params
  useEffect(() => {
    const mock = searchParams.get("mock");
    if (mock === "admin") {
      handleDeveloperLogin("ankith.ravishankar@gmail.com");
    } else if (mock === "user") {
      handleDeveloperLogin("developer@example.com");
    }
  }, [searchParams]);

  return (
    <div className="max-w-md w-full">
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-450 rounded-lg text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}
      <LoginCard
        onGoogleLogin={handleGoogleLogin}
        isLoading={authLoading}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 py-8 w-full">
      <Suspense fallback={
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading form...</div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
