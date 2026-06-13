"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface User {
  userId: string;
  email: string;
  role: string;
  collegeId: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  lastVisitedPath: string;
  setLastVisitedPath: (path: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore last visited path from sessionStorage
  const [lastVisitedPath, setLastVisitedPathState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("cm_last_path") || "/admin/super";
    }
    return "/admin/super";
  });

  const setLastVisitedPath = useCallback((path: string) => {
    setLastVisitedPathState(path);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cm_last_path", path);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Auto-refresh session every 10 minutes if user is logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchUser();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, fetchUser]);

  const refreshSession = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      // Immediately fetch user from /api/auth/me for correct shape
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const meData = await meRes.json();
      setUser(meData.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "GET", credentials: "include" });
    } finally {
      setUser(null);
      setLoading(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("cm_last_path");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshSession,
        lastVisitedPath,
        setLastVisitedPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}