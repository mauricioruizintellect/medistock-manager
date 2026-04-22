import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export type InventoryMovementType = "purchase" | "in" | "sale" | "out" | "adjustment";

export interface InventoryStockItem {
  branch_product_id: number;
  branch_name?: string;
  product_name: string;
  sku?: string;
  current_stock: string | number;
  min_stock: string | number;
  nearest_lot_number?: string | null;
  nearest_expiration_date?: string | null;
}

export interface InventoryMovementItem {
  inventory_movement_id: number;
  created_at: string;
  product_name: string;
  movement_type: InventoryMovementType;
  quantity: string | number;
  notes?: string | null;
  user_name?: string | null;
}

export interface InventoryQueryParams {
  pharmacy_id?: number;
  branch_id?: number;
  product_id?: number;
  branch_product_id?: number;
}

export interface InventoryMovementsQueryParams extends InventoryQueryParams {
  movement_type?: InventoryMovementType;
  date_from?: string;
  date_to?: string;
}

export interface InventoryStockResponse {
  total: number;
  items: InventoryStockItem[];
}

export interface InventoryMovementsResponse {
  total: number;
  items: InventoryMovementItem[];
}

interface InventoryEnvelope<TItem> {
  total?: number;
  items?: TItem[];
  data?: TItem[];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapInventoryList<TItem>(data: InventoryEnvelope<TItem> | TItem[]) {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.data ?? [];

  return {
    total: data.total ?? items.length,
    items,
  };
}

export async function getInventoryStock(params: InventoryQueryParams = {}): Promise<InventoryStockResponse> {
  try {
    const { data } = await apiClient.get<InventoryEnvelope<InventoryStockItem> | InventoryStockItem[]>(
      "/inventory/stock",
      { params },
    );
    return unwrapInventoryList(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener las existencias."));
  }
}

export async function getInventoryMovements(
  params: InventoryMovementsQueryParams = {},
): Promise<InventoryMovementsResponse> {
  try {
    const { data } = await apiClient.get<InventoryEnvelope<InventoryMovementItem> | InventoryMovementItem[]>(
      "/inventory/movements",
      { params },
    );
    return unwrapInventoryList(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener los movimientos de inventario."));
  }
}
