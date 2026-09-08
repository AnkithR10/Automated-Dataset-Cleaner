import { useAuthContext } from "@/context/AuthContext";
import { useEffect, useState } from "react";

/**
 * Custom React hook for accessing the user's active session,
 * identity token, loading indicator, and authentication methods.
 * Also exposes `isPremium` (sourced from localStorage after Razorpay payment)
 * and `isFounder` (email matches NEXT_PUBLIC_OWNER_EMAIL).
 */
export const useAuth = () => {
  const { user, idToken, loading, logout, signInWithGoogle, signInWithMock } = useAuthContext();
  const [isPremium, setIsPremium] = useState(false);

  // Read isPremium from localStorage (SSR-safe — runs client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPremium(localStorage.getItem("isPremium") === "true");
    }
  }, [user]); // Re-evaluate when user changes (e.g. after login)

  const isAdmin =
    !!user?.email &&
    (user.email === "ankith.ravishankar@gmail.com" ||
     user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
     user.email === process.env.NEXT_PUBLIC_OWNER_EMAIL);

  return {
    user,
    idToken,
    loading,
    isAuthenticated: !!user,
    isPremium,
    isFounder: isAdmin,
    isAdmin,
    logout,
    signInWithGoogle,
    signInWithMock
  };
};
