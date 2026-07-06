import { AxiosError } from "axios";

export interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
}

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const normalizeApiMessage = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(". ");
  }

  return value;
};

export function buildApiError(error: unknown, fallback: string) {
  if (!error) {
    return new ApiRequestError(fallback);
  }

  if (error instanceof ApiRequestError) {
    return error;
  }

  if (error instanceof Error && !(error instanceof AxiosError)) {
    return new ApiRequestError(error.message || fallback);
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const message =
    normalizeApiMessage(axiosError.response?.data?.message) ||
    normalizeApiMessage(axiosError.response?.data?.error) ||
    fallback;

  return new ApiRequestError(message, axiosError.response?.status);
}

export function getErrorMessage(
  error: unknown,
  fallback: string,
  statusMessages: Partial<Record<number, string>> = {},
) {
  if (!error) {
    return fallback;
  }

  const apiError = error instanceof ApiRequestError ? error : buildApiError(error, fallback);

  if (apiError.status && statusMessages[apiError.status]) {
    return statusMessages[apiError.status] as string;
  }

  return apiError.message || fallback;
}
