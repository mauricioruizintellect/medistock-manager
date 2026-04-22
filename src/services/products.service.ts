import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import type { BranchStatus } from "@/services/branches.service";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface ProductMaster {
  id: number;
  pharmacy_id: number;
  pharmacy_name?: string;
  category_id: number | null;
  category_name?: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  generic_name: string | null;
  description: string | null;
  brand: string | null;
  pharmaceutical_form: string | null;
  presentation: string | null;
  concentration: string | null;
  unit_of_measure: string | null;
  requires_prescription: boolean | number;
  is_controlled_substance: boolean | number;
  tax_rate: string | number;
  status: BranchStatus;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductPayload {
  pharmacy_id: number;
  category_id?: number;
  sku: string;
  barcode?: string;
  name: string;
  generic_name?: string;
  description?: string;
  brand?: string;
  pharmaceutical_form?: string;
  presentation?: string;
  concentration?: string;
  unit_of_measure?: string;
  requires_prescription?: boolean;
  is_controlled_substance?: boolean;
  tax_rate?: number;
  status?: BranchStatus;
}

export interface GetProductsParams {
  pharmacy_id?: number;
}

export interface ProductsListResponse {
  pharmacy_id?: number;
  total: number;
  items: ProductMaster[];
}

interface ProductEnvelope {
  product?: ProductMaster;
  data?: ProductMaster;
}

interface ProductsEnvelope {
  pharmacy_id?: number;
  total?: number;
  items?: ProductMaster[];
  products?: ProductMaster[];
  data?: ProductMaster[];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapProduct(data: ProductMaster | ProductEnvelope) {
  if ("product" in data && data.product) {
    return data.product;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as ProductMaster;
}

function unwrapProducts(data: ProductsEnvelope | ProductMaster[]): ProductsListResponse {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.products ?? data.data ?? [];

  return {
    pharmacy_id: data.pharmacy_id,
    total: data.total ?? items.length,
    items,
  };
}

export async function getProducts(params: GetProductsParams = {}): Promise<ProductsListResponse> {
  try {
    const { data } = await apiClient.get<ProductsEnvelope | ProductMaster[]>("/products", { params });
    return unwrapProducts(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener los productos."));
  }
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductMaster> {
  try {
    const { data } = await apiClient.post<ProductMaster | ProductEnvelope>("/products", payload);
    return unwrapProduct(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el producto."));
  }
}
