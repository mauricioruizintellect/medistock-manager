import { apiClient } from "@/lib/api-client";
import { buildApiError } from "@/lib/api-errors";

export type PaymentMethod = "cash" | "card" | "transfer";
export type DiscountType = "percentage" | "amount";

export interface SaleItemPayload {
  branch_product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateSalePayload {
  branch_id: number;
  client_id?: number;
  payment_method: PaymentMethod;
  discount_type?: DiscountType;
  discount_value?: number;
  payment_status?: "pending" | "paid" | "partial" | "voided";
  notes?: string;
  items: SaleItemPayload[];
}

export interface SaleSummary {
  id: number;
  client_id?: number | null;
  ticket_number: string;
  subtotal: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total: string | number;
  payment_method?: PaymentMethod | null;
  payment_status?: string | null;
  discount_type?: DiscountType | null;
  discount_value?: string | number | null;
  created_at: string;
}

export interface SaleDetailItem {
  id: number;
  branch_product_id: number;
  product_id?: number | null;
  product_name: string;
  sku?: string | null;
  quantity: string | number;
  unit_price: string | number;
  discount_amount: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  line_total: string | number;
  requires_prescription: boolean;
}

export interface SaleDetail extends SaleSummary {
  branch_id: number;
  client_id?: number | null;
  pharmacy_id?: number | null;
  cashier_user_id?: number | null;
  customer_name?: string | null;
  customer_document?: string | null;
  client?: {
    id: number;
    full_name: string;
    document_number?: string | null;
  } | null;
  notes?: string | null;
  items: SaleDetailItem[];
}

interface SaleEnvelope<TSale> {
  sale?: TSale;
}

export async function createSale(payload: CreateSalePayload): Promise<SaleSummary> {
  try {
    const { data } = await apiClient.post<SaleEnvelope<SaleSummary>>("/sales", payload);

    if (!data.sale) {
      throw new Error("La respuesta del servidor no incluyó la venta creada.");
    }

    return data.sale;
  } catch (error) {
    throw buildApiError(error, "No se pudo registrar la venta.");
  }
}

export async function getSaleById(saleId: number): Promise<SaleDetail> {
  try {
    const { data } = await apiClient.get<SaleEnvelope<SaleDetail>>(`/sales/${saleId}`);

    if (!data.sale) {
      throw new Error("La respuesta del servidor no incluyó el detalle de la venta.");
    }

    return data.sale;
  } catch (error) {
    throw buildApiError(error, "No se pudo obtener el detalle de la venta.");
  }
}
