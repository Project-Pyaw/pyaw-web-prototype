import { authenticatedApi } from "@/features/auth/session/session";

import type {
  AccountLookupResult,
  Connection,
  ConnectionPage,
  ConnectionRequest,
  ConnectionRequestDirection,
} from "../types";

type ListConnectionRequestsInput = Readonly<{
  direction: ConnectionRequestDirection;
  status?: "PENDING";
}>;

function withQuery(path: string, query: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function lookupAccountByPhone(
  phone: string,
): Promise<AccountLookupResult> {
  return authenticatedApi.post<AccountLookupResult, { phone: string }>(
    "/accounts/lookup",
    { phone },
  );
}

export function getConnections(): Promise<ConnectionPage<Connection>> {
  return authenticatedApi.get<ConnectionPage<Connection>>(
    "/account/connections",
  );
}

export function getConnectionRequests({
  direction,
  status,
}: ListConnectionRequestsInput): Promise<ConnectionPage<ConnectionRequest>> {
  return authenticatedApi.get<ConnectionPage<ConnectionRequest>>(
    withQuery("/account/connections/requests", { direction, status }),
  );
}

export function sendConnectionRequest(
  recipientAccountId: string,
): Promise<ConnectionRequest> {
  return authenticatedApi.post<
    ConnectionRequest,
    { recipientAccountId: string }
  >("/account/connections/requests", { recipientAccountId });
}

export function respondToConnectionRequest(
  requestId: string,
  status: "ACCEPTED" | "REJECTED",
): Promise<ConnectionRequest> {
  return authenticatedApi.patch<ConnectionRequest, { status: string }>(
    `/account/connections/requests/${requestId}`,
    { status },
  );
}
