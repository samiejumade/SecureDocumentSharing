"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, setSession, clearSession, type AuthSession } from "@/lib/auth";

interface AuthContextValue {
  user: AuthSession | null;
  isLoading: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Public routes that don't require authentication */
const PUBLIC_PATHS = ["/", "/login", "/share", "/auth/verify"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session on mount
  useEffect(() => {
    const session = getSession();
    setUser(session);
    setIsLoading(false);
  }, []);

  // Protect routes — redirect to login if not authenticated
  useEffect(() => {
    if (isLoading) return;
    if (!user && !isPublicPath(pathname)) {
      router.replace("/login");
    }
  }, [user, isLoading, pathname, router]);

  // Listen for auth changes (e.g. from other tabs)
  useEffect(() => {
    const handler = () => {
      setUser(getSession());
    };
    window.addEventListener("sdc:auth-changed", handler);
    window.addEventListener("storage", (e) => {
      if (e.key === "sdc_auth_session" || e.key === null) handler();
    });
    return () => {
      window.removeEventListener("sdc:auth-changed", handler);
    };
  }, []);

  const login = useCallback((session: AuthSession) => {
    setSession(session);
    setUser(session);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
