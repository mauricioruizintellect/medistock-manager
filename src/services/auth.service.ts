import { apiClient } from "@/lib/api-client";
import { buildApiError } from "@/lib/api-errors";
import type { AuthSession, AuthUser, LoginPayload } from "@/lib/auth";

interface AuthSessionEnvelope {
  token?: string;
  user?: AuthUser;
  data?: AuthSession | { token?: string; user?: AuthUser };
  session?: AuthSession;
}

interface AuthUserEnvelope {
  user?: AuthUser;
  data?: AuthUser | { user?: AuthUser };
}

function unwrapAuthSession(data: AuthSession | AuthSessionEnvelope): AuthSession {
  if ("token" in data && data.token && "user" in data && data.user) {
    return {
      token: data.token,
      user: data.user,
    };
  }

  if ("session" in data && data.session) {
    return data.session;
  }

  if ("data" in data && data.data) {
    return unwrapAuthSession(data.data);
  }

  throw new Error("La respuesta del servidor no incluyó la sesión del usuario.");
}

function unwrapAuthUser(data: AuthUser | AuthUserEnvelope): AuthUser {
  if ("user" in data && data.user) {
    return data.user;
  }

  if ("data" in data && data.data) {
    return unwrapAuthUser(data.data);
  }

  return data as AuthUser;
}

export async function loginService(payload: LoginPayload): Promise<AuthSession> {
  try {
    const { data } = await apiClient.post<AuthSession | AuthSessionEnvelope>("/auth/login", payload);
    return unwrapAuthSession(data);
  } catch (error) {
    throw buildApiError(error, "No se pudo iniciar sesión. Verifica tus credenciales.");
  }
}

export async function getCurrentUserService(): Promise<AuthUser> {
  try {
    const { data } = await apiClient.get<AuthUser | AuthUserEnvelope>("/auth/me");
    return unwrapAuthUser(data);
  } catch (error) {
    throw buildApiError(error, "No se pudo obtener la sesión actual.");
  }
}
