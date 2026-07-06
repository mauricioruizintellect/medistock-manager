import { apiClient } from "@/lib/api-client";
import { buildApiError } from "@/lib/api-errors";
import type { BranchStatus } from "@/services/branches.service";

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

export async function createInitialInventoryLot(payload: InitialInventoryLotPayload) {
  try {
    const { data } = await apiClient.post("/inventory-lots/initial-load", payload);
    return data;
  } catch (error) {
    throw buildApiError(error, "No se pudo cargar el inventario inicial.");
  }
}

export async function receiveInventoryLots(
  payload: ReceiveInventoryLotPayload | ReceiveInventoryLotPayload[],
): Promise<ReceiveInventoryLotsResponse> {
  try {
    const { data } = await apiClient.post<ReceiveInventoryLotsResponse>("/inventory-lots/receive", payload);
    return data;
  } catch (error) {
    throw buildApiError(error, "No se pudo ingresar el nuevo lote.");
  }
}
