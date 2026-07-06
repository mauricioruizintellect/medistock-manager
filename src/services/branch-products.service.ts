import { apiClient } from "@/lib/api-client";
import { buildApiError } from "@/lib/api-errors";
import type { BranchStatus } from "@/services/branches.service";

export interface BranchProduct {
  id: number;
  branch_id: number;
  branch_name?: string;
  pharmacy_id?: number;
  pharmacy_name?: string;
  product_id: number;
  product_name?: string;
  sku?: string;
  barcode?: string | null;
  generic_name?: string | null;
  brand?: string | null;
  pharmaceutical_form?: string | null;
  presentation?: string | null;
  concentration?: string | null;
  unit_of_measure?: string | null;
  tax_rate?: string | number;
  requires_prescription?: boolean | number;
  is_controlled_substance?: boolean | number;
  sale_price: string | number;
  cost_price_default?: string | number;
  min_stock?: string | number;
  max_stock?: string | number;
  reorder_point?: string | number;
  current_stock?: string | number;
  reserved_stock?: string | number;
  shelf_location: string | null;
  is_sellable: boolean | number;
  is_visible_in_pos: boolean | number;
  status: BranchStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBranchProductPayload {
  branch_id: number;
  product_id: number;
  sale_price?: number;
  cost_price_default?: number;
  min_stock?: number;
  max_stock?: number;
  reorder_point?: number;
  shelf_location?: string;
  is_sellable?: boolean;
  is_visible_in_pos?: boolean;
  status?: BranchStatus;
}

export interface UpdateBranchProductPayload {
  sale_price?: number;
  cost_price_default?: number;
  min_stock?: number;
  max_stock?: number;
  reorder_point?: number;
  shelf_location?: string;
  is_sellable?: boolean;
  is_visible_in_pos?: boolean;
  status?: BranchStatus;
}

interface BranchProductEnvelope {
  branch_product?: BranchProduct;
  data?: BranchProduct;
}

interface BranchProductsEnvelope {
  pharmacy_id?: number;
  branch_id?: number | null;
  product_id?: number;
  total?: number;
  items?: BranchProduct[];
  branch_products?: BranchProduct[];
  data?: BranchProduct[];
}

export interface GetBranchProductsParams {
  pharmacy_id?: number;
  branch_id?: number;
  product_id?: number;
  search?: string;
  status?: BranchStatus;
  is_visible_in_pos?: boolean;
  is_sellable?: boolean;
  has_stock?: boolean;
}

export interface BranchProductsListResponse {
  pharmacy_id?: number;
  branch_id?: number | null;
  product_id?: number;
  total: number;
  items: BranchProduct[];
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

function unwrapBranchProducts(data: BranchProductsEnvelope | BranchProduct[]): BranchProductsListResponse {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.branch_products ?? data.data ?? [];

  return {
    pharmacy_id: data.pharmacy_id,
    branch_id: data.branch_id,
    product_id: data.product_id,
    total: data.total ?? items.length,
    items,
  };
}

export async function getBranchProducts(params: GetBranchProductsParams = {}): Promise<BranchProductsListResponse> {
  try {
    const { data } = await apiClient.get<BranchProductsEnvelope | BranchProduct[]>("/branch-products", { params });
    return unwrapBranchProducts(data);
  } catch (error) {
    throw buildApiError(error, "No se pudieron obtener las asignaciones por sucursal.");
  }
}

export async function createBranchProduct(payload: CreateBranchProductPayload): Promise<BranchProduct> {
  try {
    const { data } = await apiClient.post<BranchProduct | BranchProductEnvelope>("/branch-products", payload);
    return unwrapBranchProduct(data);
  } catch (error) {
    throw buildApiError(error, "No se pudo asignar el producto a la sucursal.");
  }
}

export async function updateBranchProduct(
  branchProductId: number,
  payload: UpdateBranchProductPayload,
): Promise<BranchProduct> {
  try {
    const { data } = await apiClient.put<BranchProduct | BranchProductEnvelope>(`/branch-products/${branchProductId}`, payload);
    return unwrapBranchProduct(data);
  } catch (error) {
    throw buildApiError(error, "No se pudo actualizar la asignación del producto.");
  }
}
