import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface PharmacyUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
  pharmacy_id: number | null;
  pharmacy_name: string | null;
  role_id: number;
  role_code: string;
  role_name: string;
  is_super_admin: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  code: string;
  name: string;
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  pharmacy_id?: number;
  role_id: number;
  status: "active" | "inactive";
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role_id?: number;
  status?: "active" | "inactive";
}

interface UsersEnvelope {
  users?: PharmacyUser[];
  data?: PharmacyUser[];
}

interface RolesEnvelope {
  roles?: UserRole[];
  data?: UserRole[];
}

interface UserEnvelope {
  user?: PharmacyUser;
  data?: PharmacyUser;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapUser(data: PharmacyUser | UserEnvelope) {
  if ("user" in data && data.user) {
    return data.user;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as PharmacyUser;
}

export async function getUsersByPharmacy(pharmacyId: number): Promise<PharmacyUser[]> {
  try {
    const { data } = await apiClient.get<UsersEnvelope | PharmacyUser[]>(`/users/pharmacy/${pharmacyId}`);

    if (Array.isArray(data)) {
      return data;
    }

    return data.users ?? data.data ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener los usuarios de la farmacia."));
  }
}

export async function getUserRoles(): Promise<UserRole[]> {
  try {
    const { data } = await apiClient.get<RolesEnvelope | UserRole[]>("/users/utilities/roles");

    if (Array.isArray(data)) {
      return data;
    }

    return data.roles ?? data.data ?? [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener los roles."));
  }
}

export async function createUser(payload: CreateUserPayload): Promise<PharmacyUser> {
  try {
    const { data } = await apiClient.post<PharmacyUser | UserEnvelope>("/users", payload);
    return unwrapUser(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el usuario."));
  }
}

export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<PharmacyUser> {
  try {
    const { data } = await apiClient.put<PharmacyUser | UserEnvelope>(`/users/${userId}`, payload);
    return unwrapUser(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el usuario."));
  }
}

export async function deactivateUser(userId: number): Promise<PharmacyUser> {
  return updateUser(userId, { status: "inactive" });
}
