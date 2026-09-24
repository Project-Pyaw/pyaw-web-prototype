import { getPublicConfig } from "@/config/env";

import { ApiError } from "./api-error";
import type {
  ApiFailureEnvelope,
  ApiRequestOptions,
  ApiResponse,
  ApiSuccessEnvelope,
} from "./types";

export type ApiClientOptions = Readonly<{
  getAccessToken?: () => string | undefined;
}>;

function buildApiUrl(path: string): string {
  const { apiBaseUrl } = getPublicConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${apiBaseUrl}${normalizedPath}`;
}

function isFailureEnvelope(value: unknown): value is ApiFailureEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<ApiFailureEnvelope>;
  const error = response.error;

  return (
    response.success === false &&
    !!error &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

function isSuccessEnvelope<T>(value: unknown): value is ApiSuccessEnvelope<T> {
  return (
    !!value &&
    typeof value === "object" &&
    (value as Partial<ApiSuccessEnvelope<T>>).success === true &&
    "data" in value
  );
}

function hasNoBody(response: Response): boolean {
  return (
    response.status === 204 ||
    response.status === 205 ||
    response.headers.get("content-length") === "0"
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions = {}) {}

  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>("GET", path, options).then(
      (response) => response.data,
    );
  }

  getWithResponse<T>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path, options);
  }

  post<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>("POST", path, options, body).then(
      (response) => response.data,
    );
  }

  put<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>("PUT", path, options, body).then(
      (response) => response.data,
    );
  }

  patch<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>("PATCH", path, options, body).then(
      (response) => response.data,
    );
  }

  delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, options).then(
      (response) => response.data,
    );
  }

  private async request<T>(
    method: string,
    path: string,
    options: ApiRequestOptions = {},
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const accessToken = this.options.getAccessToken?.();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    let response: Response;

    try {
      response = await fetch(buildApiUrl(path), {
        ...options,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers,
        method,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      throw new ApiError({
        code: "NETWORK_ERROR",
        message: "Unable to reach the service.",
        status: 0,
      });
    }

    if (hasNoBody(response)) {
      if (!response.ok) {
        throw new ApiError({
          code: "REQUEST_FAILED",
          message: "Request failed.",
          status: response.status,
        });
      }

      return {
        data: undefined as T,
        headers: response.headers,
        status: response.status,
      };
    }

    const payload = await this.readJson(response);

    if (isFailureEnvelope(payload)) {
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status: response.status,
      });
    }

    if (!response.ok) {
      throw new ApiError({
        code: "REQUEST_FAILED",
        message: "Request failed.",
        status: response.status,
      });
    }

    if (!isSuccessEnvelope<T>(payload)) {
      throw new ApiError({
        code: "INVALID_RESPONSE",
        message: "The service returned an invalid response.",
        status: response.status,
      });
    }

    return {
      data: payload.data,
      headers: response.headers,
      status: response.status,
    };
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      throw new ApiError({
        code: "INVALID_RESPONSE",
        message: "The service returned an invalid response.",
        status: response.status,
      });
    }
  }
}

export const api = new ApiClient();
