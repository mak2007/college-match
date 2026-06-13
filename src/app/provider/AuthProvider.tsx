"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  userId: string;
  email: string;
  role: string;
  collegeId: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  user: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }
        // Not authenticated → redirect to login preserving intended route
        const currentPath = window.location.pathname + window.location.search;
        router.replace(`/admin/login?redirect=${encodeURIComponent(currentPath)}`);
      } catch (e) {
        console.error("AuthProvider error", e);
        const currentPath = window.location.pathname + window.location.search;
        router.replace(`/admin/login?redirect=${encodeURIComponent(currentPath)}`);
      }
    };
    fetchMe();
  }, []);

  const value: AuthContextType = {
    isAuthenticated: !!user,
    loading,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
