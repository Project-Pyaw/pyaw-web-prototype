import { ApiError } from "@/lib/api/api-error";
import { api } from "@/lib/api/client";

type OtpRequestResponse = Readonly<{
  message: string;
}>;

type AuthenticatedAccount = Readonly<{
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  deletionRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type VerifyPhoneOtpResponse = Readonly<{
  account: AuthenticatedAccount;
  accessToken: string;
}>;

type OtpRequestPayload = Readonly<{
  channel: "PHONE";
  identifier: string;
  purpose: "LOGIN";
}>;

type OtpVerifyPayload = OtpRequestPayload &
  Readonly<{
    otp: string;
    transport: "WEB";
  }>;

function hasAccessToken(value: VerifyPhoneOtpResponse): boolean {
  return typeof value.accessToken === "string" && value.accessToken.length > 0;
}

function toOtpPayload(identifier: string): OtpRequestPayload {
  return {
    channel: "PHONE",
    identifier,
    purpose: "LOGIN",
  };
}

export function requestPhoneOtp(
  identifier: string,
): Promise<OtpRequestResponse> {
  return api.post<OtpRequestResponse, OtpRequestPayload>(
    "/auth/otp/request",
    toOtpPayload(identifier),
    { authentication: "none", retryOnAccessTokenExpired: false },
  );
}

export async function verifyPhoneOtp(
  identifier: string,
  otp: string,
): Promise<VerifyPhoneOtpResponse> {
  const response = await api.post<VerifyPhoneOtpResponse, OtpVerifyPayload>(
    "/auth/otp/verify",
    { ...toOtpPayload(identifier), otp, transport: "WEB" },
    {
      authentication: "none",
      credentials: "include",
      retryOnAccessTokenExpired: false,
    },
  );

  if (!hasAccessToken(response)) {
    throw new ApiError({
      code: "INVALID_RESPONSE",
      message: "The service returned an invalid response.",
      status: 200,
    });
  }

  return response;
}
