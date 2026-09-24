export type ApiSuccessEnvelope<T> = Readonly<{
  success: true;
  data: T;
}>;

export type ApiFailureEnvelope = Readonly<{
  success: false;
  error: Readonly<{
    code: string;
    message: string;
  }>;
  timestamp: string;
}>;

export type ApiResponse<T> = Readonly<{
  data: T;
  headers: Headers;
  status: number;
}>;

export type ApiRequestOptions = Omit<
  RequestInit,
  "body" | "headers" | "method"
> & {
  authentication?: "auto" | "none";
  headers?: HeadersInit;
  retryOnAccessTokenExpired?: boolean;
};
