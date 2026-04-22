import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import type { BranchStatus } from "@/services/branches.service";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface InitialInventoryLotPayload {
  branch_product_id: number;
  lot_number: string;
  expiration_date: string;
  purchase_price: number;
  initial_quantity: number;
  current_quantity: number;
  received_at?: string;
  supplier_name?: string;
  invoice_reference?: string;
  status?: BranchStatus;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

export async function createInitialInventoryLot(payload: InitialInventoryLotPayload) {
  try {
    const { data } = await apiClient.post("/inventory-lots/initial-load", payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el inventario inicial."));
  }
}
