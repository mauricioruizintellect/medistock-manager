export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_super_admin: boolean;
  role_id: number;
  role_code: string;
  role_name: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const AUTH_STORAGE_KEY = "medistock.auth.session";
const isBrowser = typeof window !== "undefined";

export function getStoredSession(): AuthSession | null {
  if (!isBrowser) {
    return null;
  }

  const rawSession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession) {
  if (!isBrowser) {
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (!isBrowser) {
    return;
  }

  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthToken() {
  return getStoredSession()?.token ?? null;
}

export function getAuthHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { AUTH_STORAGE_KEY };
