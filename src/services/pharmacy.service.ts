import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  legal_name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  status: string;
  created_by: number;
  created_by_name: string;
  updated_by: number;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface UpdatePharmacyPayload {
  name: string;
  legal_name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  status: string;
}

interface PharmacyEnvelope {
  data?: Pharmacy;
  pharmacy?: Pharmacy;
}

export async function getPharmacyById(pharmacyId: number): Promise<Pharmacy> {
  try {
    const { data } = await apiClient.get<Pharmacy | PharmacyEnvelope>(`/pharmacies/${pharmacyId}`);

    if ("data" in data && data.data) {
      return data.data;
    }

    if ("pharmacy" in data && data.pharmacy) {
      return data.pharmacy;
    }

    return data as Pharmacy;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      "No se pudo obtener la farmacia del usuario.";

    throw new Error(message);
  }
}

export async function updatePharmacyById(pharmacyId: number, payload: UpdatePharmacyPayload): Promise<Pharmacy> {
  try {
    const { data } = await apiClient.put<Pharmacy | PharmacyEnvelope>(`/pharmacies/${pharmacyId}`, payload);

    if ("data" in data && data.data) {
      return data.data;
    }

    if ("pharmacy" in data && data.pharmacy) {
      return data.pharmacy;
    }

    return data as Pharmacy;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      "No se pudo actualizar la farmacia.";

    throw new Error(message);
  }
}
