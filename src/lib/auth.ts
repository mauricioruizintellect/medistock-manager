export interface AuthUserPharmacy {
  id: number;
  name: string;
  legal_name?: string | null;
  status?: string | null;
}

export interface AuthUserBranch {
  id?: number;
  branch_id?: number;
  name?: string;
  branch_name?: string;
  pharmacy_id: number;
  role_id: number | null;
  role_code: string | null;
  role_name: string | null;
  is_default: boolean;
}

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  pharmacy_id: number | null;
  is_super_admin: boolean;
  role_id: number | null;
  role_code: string | null;
  role_name: string | null;
  default_branch_id?: number | null;
  default_branch?: AuthUserBranch | null;
  pharmacies?: AuthUserPharmacy[];
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const AUTH_STORAGE_KEY = "farmacia-cyr.auth.session";
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
