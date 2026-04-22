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

export interface ReceiveInventoryLotPayload {
  branch_product_id: number;
  lot_number: string;
  expiration_date: string;
  purchase_price: number;
  quantity: number;
  received_at?: string;
  supplier_name?: string;
  invoice_reference?: string;
  notes?: string;
  status?: BranchStatus;
}

export interface ReceiveInventoryLotsResponse {
  message: string;
  mode: "single" | "bulk";
  total_processed: number;
  items: Array<{
    inventory_lot_id: number;
    branch_product_id: number;
    lot_number: string;
    quantity_received: number;
  }>;
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

export async function receiveInventoryLots(
  payload: ReceiveInventoryLotPayload | ReceiveInventoryLotPayload[],
): Promise<ReceiveInventoryLotsResponse> {
  try {
    const { data } = await apiClient.post<ReceiveInventoryLotsResponse>("/inventory-lots/receive", payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo ingresar el nuevo lote."));
  }
}
