"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { auth, signInWithGoogle as firebaseSignInWithGoogle, getRedirectResult } from "@/lib/firebase";

interface AuthContextType {
  user: any | null;
  idToken: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signInWithMock: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if there is a mock session in sessionStorage (for local dev bypass)
    const mockUserStr = typeof window !== "undefined" ? sessionStorage.getItem("mock_user") : null;
    const mockToken = typeof window !== "undefined" ? sessionStorage.getItem("mock_id_token") : null;
    if (mockUserStr && mockToken) {
      setUser(JSON.parse(mockUserStr));
      setIdToken(mockToken);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const token = await firebaseUser.getIdToken(true);
          setIdToken(token);
        } catch (err) {
          console.error("Failed to retrieve Firebase ID token:", err);
          setIdToken(null);
        }
      } else {
        setUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    // Handle Redirect Result for Vercel/mobile browsers
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setUser(result.user);
          const token = await result.user.getIdToken(true);
          setIdToken(token);
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error:", error);
      });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("mock_user");
        sessionStorage.removeItem("mock_id_token");
      }
      await signOut(auth);
      setUser(null);
      setIdToken(null);
    } catch (error) {
      console.error("Firebase SignOut error:", error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await firebaseSignInWithGoogle();
      if (result?.user) {
        setUser(result.user);
        const token = await result.user.getIdToken(true);
        setIdToken(token);
      }
      setLoading(false);
      return result;
    } catch (error: any) {
      console.error("Auth error:", error?.code, error?.message);
      setLoading(false);
      throw error;
    }
  };

  const signInWithMock = async (email: string) => {
    setLoading(true);
    try {
      const mockUser = {
        uid: "mock_uid_" + email.split("@")[0],
        email: email,
        displayName: email.split("@")[0].toUpperCase(),
        photoURL: null,
      };
      const mockToken = `mock-token-${email}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("mock_user", JSON.stringify(mockUser));
        sessionStorage.setItem("mock_id_token", mockToken);
      }
      setUser(mockUser);
      setIdToken(mockToken);
      return { user: mockUser };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, idToken, loading, logout, signInWithGoogle, signInWithMock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

