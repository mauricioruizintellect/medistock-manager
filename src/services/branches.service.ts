import { apiClient } from "@/lib/api-client";
import { buildApiError } from "@/lib/api-errors";

export type BranchStatus = "active" | "inactive";

export interface Branch {
  id: number;
  pharmacy_id: number;
  pharmacy_name?: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  status: BranchStatus;
  is_main: boolean | number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchPayload {
  pharmacy_id: number;
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  status?: BranchStatus;
  is_main?: boolean;
}

export interface UpdateBranchPayload {
  pharmacy_id?: number;
  code?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  status?: BranchStatus;
  is_main?: boolean;
}

export interface GetBranchesParams {
  pharmacy_id?: number;
  status?: BranchStatus;
  search?: string;
}

export interface BranchesListResponse {
  pharmacy_id?: number;
  total: number;
  items: Branch[];
}

interface BranchEnvelope {
  branch?: Branch;
  data?: Branch;
}

interface BranchesEnvelope {
  pharmacy_id?: number;
  total?: number;
  items?: Branch[];
  branches?: Branch[];
  data?: Branch[];
}

function unwrapBranch(data: Branch | BranchEnvelope) {
  if ("branch" in data && data.branch) {
    return data.branch;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as Branch;
}

function unwrapBranches(data: BranchesEnvelope | Branch[]): BranchesListResponse {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.branches ?? data.data ?? [];

  return {
    pharmacy_id: data.pharmacy_id,
    total: data.total ?? items.length,
    items,
  };
}

export async function getBranches(params: GetBranchesParams = {}): Promise<BranchesListResponse> {
  try {
    const { data } = await apiClient.get<BranchesEnvelope | Branch[]>("/branches", { params });
    return unwrapBranches(data);
  } catch (error) {
    throw buildApiError(error, "No se pudieron obtener las sucursales.");
  }
}

export async function createBranch(payload: CreateBranchPayload): Promise<Branch> {
  try {
    const { data } = await apiClient.post<Branch | BranchEnvelope>("/branches", payload);
    return unwrapBranch(data);
  } catch (error) {
    throw buildApiError(error, "No se pudo crear la sucursal.");
  }
}

export async function updateBranch(branchId: number, payload: UpdateBranchPayload): Promise<Branch> {
  try {
    const { data } = await apiClient.put<Branch | BranchEnvelope>(`/branches/${branchId}`, payload);
    return unwrapBranch(data);
  } catch (error) {
    throw buildApiError(error, "No se pudo actualizar la sucursal.");
  }
}
