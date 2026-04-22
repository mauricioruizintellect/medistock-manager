import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import type { BranchStatus } from "@/services/branches.service";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface BranchProduct {
  id: number;
  branch_id: number;
  product_id: number;
  sale_price: string | number;
  cost_price_default: string | number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  current_stock: number;
  reserved_stock: number;
  shelf_location: string | null;
  is_sellable: boolean | number;
  is_visible_in_pos: boolean | number;
  status: BranchStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchProductPayload {
  branch_id: number;
  product_id: number;
  sale_price?: number;
  cost_price_default?: number;
  min_stock?: number;
  max_stock?: number;
  reorder_point?: number;
  current_stock?: number;
  reserved_stock?: number;
  shelf_location?: string;
  is_sellable?: boolean;
  is_visible_in_pos?: boolean;
  status?: BranchStatus;
}

interface BranchProductEnvelope {
  branch_product?: BranchProduct;
  data?: BranchProduct;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapBranchProduct(data: BranchProduct | BranchProductEnvelope) {
  if ("branch_product" in data && data.branch_product) {
    return data.branch_product;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as BranchProduct;
}

export async function createBranchProduct(payload: CreateBranchProductPayload): Promise<BranchProduct> {
  try {
    const { data } = await apiClient.post<BranchProduct | BranchProductEnvelope>("/branch-products", payload);
    return unwrapBranchProduct(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo asignar el producto a la sucursal."));
  }
}
