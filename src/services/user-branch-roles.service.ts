import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import type { BranchStatus } from "@/services/branches.service";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface UserBranchRole {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  user_email: string;
  branch_id: number;
  branch_name: string;
  pharmacy_id: number;
  pharmacy_name?: string;
  role_id: number;
  role_code: string;
  role_name: string;
  is_default: boolean | number;
  status: BranchStatus;
  created_at: string;
  updated_at: string;
}

export interface GetUserBranchRolesParams {
  pharmacy_id?: number;
  branch_id?: number;
  user_id?: number;
  role_id?: number;
  status?: BranchStatus;
}

export interface UserBranchRolesListResponse {
  pharmacy_id?: number | null;
  branch_id?: number | null;
  user_id?: number | null;
  role_id?: number | null;
  total: number;
  items: UserBranchRole[];
}

export interface CreateUserBranchRolePayload {
  user_id: number;
  branch_id: number;
  role_id: number;
  is_default?: boolean;
  status?: BranchStatus;
}

interface UserBranchRoleEnvelope {
  user_branch_role?: UserBranchRole;
  data?: UserBranchRole;
}

interface UserBranchRolesEnvelope {
  pharmacy_id?: number | null;
  branch_id?: number | null;
  user_id?: number | null;
  role_id?: number | null;
  total?: number;
  items?: UserBranchRole[];
  user_branch_roles?: UserBranchRole[];
  data?: UserBranchRole[];
}

interface DeleteUserBranchRoleEnvelope {
  result?: {
    id: number;
    deleted: boolean;
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapUserBranchRole(data: UserBranchRole | UserBranchRoleEnvelope) {
  if ("user_branch_role" in data && data.user_branch_role) {
    return data.user_branch_role;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as UserBranchRole;
}

function unwrapUserBranchRoles(data: UserBranchRolesEnvelope | UserBranchRole[]): UserBranchRolesListResponse {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.user_branch_roles ?? data.data ?? [];

  return {
    pharmacy_id: data.pharmacy_id,
    branch_id: data.branch_id,
    user_id: data.user_id,
    role_id: data.role_id,
    total: data.total ?? items.length,
    items,
  };
}

export async function getUserBranchRoles(
  params: GetUserBranchRolesParams = {},
): Promise<UserBranchRolesListResponse> {
  try {
    const { data } = await apiClient.get<UserBranchRolesEnvelope | UserBranchRole[]>("/user-branch-roles", { params });
    return unwrapUserBranchRoles(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener los usuarios de la sucursal."));
  }
}

export async function createUserBranchRole(payload: CreateUserBranchRolePayload): Promise<UserBranchRole> {
  try {
    const { data } = await apiClient.post<UserBranchRole | UserBranchRoleEnvelope>("/user-branch-roles", payload);
    return unwrapUserBranchRole(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo asignar el usuario a la sucursal."));
  }
}

export async function deleteUserBranchRole(userBranchRoleId: number): Promise<{ id: number; deleted: boolean }> {
  try {
    const { data } = await apiClient.delete<DeleteUserBranchRoleEnvelope>(`/user-branch-roles/${userBranchRoleId}`);
    return data.result ?? { id: userBranchRoleId, deleted: true };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar la asignación."));
  }
}
