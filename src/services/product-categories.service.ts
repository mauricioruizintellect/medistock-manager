import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import type { BranchStatus } from "@/services/branches.service";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface ProductCategory {
  id: number;
  pharmacy_id: number;
  pharmacy_name?: string;
  name: string;
  description: string | null;
  status: BranchStatus;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductCategoryPayload {
  pharmacy_id: number;
  name: string;
  description?: string;
  status?: BranchStatus;
}

export interface GetProductCategoriesParams {
  pharmacy_id?: number;
}

export interface ProductCategoriesListResponse {
  pharmacy_id?: number;
  total: number;
  items: ProductCategory[];
}

interface ProductCategoryEnvelope {
  category?: ProductCategory;
  product_category?: ProductCategory;
  data?: ProductCategory;
}

interface ProductCategoriesEnvelope {
  pharmacy_id?: number;
  total?: number;
  items?: ProductCategory[];
  categories?: ProductCategory[];
  product_categories?: ProductCategory[];
  data?: ProductCategory[];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapCategory(data: ProductCategory | ProductCategoryEnvelope) {
  if ("category" in data && data.category) {
    return data.category;
  }

  if ("product_category" in data && data.product_category) {
    return data.product_category;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as ProductCategory;
}

function unwrapCategories(data: ProductCategoriesEnvelope | ProductCategory[]): ProductCategoriesListResponse {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.categories ?? data.product_categories ?? data.data ?? [];

  return {
    pharmacy_id: data.pharmacy_id,
    total: data.total ?? items.length,
    items,
  };
}

export async function getProductCategories(
  params: GetProductCategoriesParams = {},
): Promise<ProductCategoriesListResponse> {
  try {
    const { data } = await apiClient.get<ProductCategoriesEnvelope | ProductCategory[]>("/product-categories", {
      params,
    });
    return unwrapCategories(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener las categorías."));
  }
}

export async function createProductCategory(payload: CreateProductCategoryPayload): Promise<ProductCategory> {
  try {
    const { data } = await apiClient.post<ProductCategory | ProductCategoryEnvelope>("/product-categories", payload);
    return unwrapCategory(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la categoría."));
  }
}
