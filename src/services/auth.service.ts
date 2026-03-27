import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import type { AuthSession, LoginPayload } from "@/lib/auth";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export async function loginService(payload: LoginPayload): Promise<AuthSession> {
  try {
    const { data } = await apiClient.post<AuthSession>("/auth/login", payload);
    return data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      "No se pudo iniciar sesión. Verifica tus credenciales.";

    throw new Error(message);
  }
}
