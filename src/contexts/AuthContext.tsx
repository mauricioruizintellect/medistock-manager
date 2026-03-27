import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { clearSession, getStoredSession, saveSession } from "@/lib/auth";
import type { AuthSession, AuthUser, LoginPayload } from "@/lib/auth";
import { loginService } from "@/services/auth.service";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  token: string | null;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(getStoredSession());
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session?.token),
      isLoading,
      session,
      token: session?.token ?? null,
      user: session?.user ?? null,
      async login(payload) {
        const nextSession = await loginService(payload);
        saveSession(nextSession);
        setSession(nextSession);
        return nextSession;
      },
      logout() {
        clearSession();
        setSession(null);
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
