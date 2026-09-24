type ApiErrorOptions = Readonly<{
  code: string;
  message: string;
  status: number;
}>;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({ code, message, status }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
