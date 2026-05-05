import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export type ClientStatus = "active" | "inactive";

export interface Client {
  id: number;
  pharmacy_id: number;
  pharmacy_name?: string;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  document_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status: ClientStatus;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  total_purchases: number;
  last_purchase_at?: string | null;
}

export interface GetClientsParams {
  pharmacy_id?: number;
  search?: string;
  status?: ClientStatus;
  limit?: number;
}

export interface ClientsListResponse {
  pharmacy_id?: number;
  total: number;
  items: Client[];
}

export interface CreateClientPayload {
  pharmacy_id?: number;
  first_name: string;
  last_name?: string;
  document_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: ClientStatus;
}

export interface UpdateClientPayload {
  first_name?: string;
  last_name?: string;
  document_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: ClientStatus;
}

interface ClientEnvelope {
  client?: Client;
  data?: Client;
}

interface ClientsEnvelope {
  pharmacy_id?: number;
  total?: number;
  items?: Client[];
  clients?: Client[];
  data?: Client[];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || axiosError.response?.data?.error || fallback;
}

function unwrapClient(data: Client | ClientEnvelope) {
  if ("client" in data && data.client) {
    return data.client;
  }

  if ("data" in data && data.data) {
    return data.data;
  }

  return data as Client;
}

function unwrapClients(data: ClientsEnvelope | Client[]): ClientsListResponse {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    };
  }

  const items = data.items ?? data.clients ?? data.data ?? [];

  return {
    pharmacy_id: data.pharmacy_id,
    total: data.total ?? items.length,
    items,
  };
}

export async function getClients(params: GetClientsParams = {}): Promise<ClientsListResponse> {
  try {
    const { data } = await apiClient.get<ClientsEnvelope | Client[]>("/clients", { params });
    return unwrapClients(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron obtener los clientes."));
  }
}

export async function getClientById(clientId: number): Promise<Client> {
  try {
    const { data } = await apiClient.get<ClientEnvelope | Client>(`/clients/${clientId}`);
    return unwrapClient(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo obtener el cliente."));
  }
}

export async function createClient(payload: CreateClientPayload): Promise<Client> {
  try {
    const { data } = await apiClient.post<ClientEnvelope | Client>("/clients", payload);
    return unwrapClient(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el cliente."));
  }
}

export async function updateClient(clientId: number, payload: UpdateClientPayload): Promise<Client> {
  try {
    const { data } = await apiClient.put<ClientEnvelope | Client>(`/clients/${clientId}`, payload);
    return unwrapClient(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el cliente."));
  }
}
