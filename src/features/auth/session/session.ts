import "client-only";

import { ApiClient, api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/api-error";

export type AuthTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

type SessionStatus = "authenticated" | "unauthenticated";

export type SessionSnapshot = Readonly<{
  status: SessionStatus;
}>;

type SessionListener = () => void;

type RefreshOperation = Readonly<{
  promise: Promise<boolean>;
  sessionVersion: number;
}>;

const TERMINAL_REFRESH_ERROR_CODES = new Set([
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_REUSED",
  "REFRESH_TOKEN_REVOKED",
]);

const unauthenticatedSnapshot: SessionSnapshot = {
  status: "unauthenticated",
};
const authenticatedSnapshot: SessionSnapshot = {
  status: "authenticated",
};

let accessToken: string | undefined;
let refreshToken: string | undefined;
let refreshOperation: RefreshOperation | undefined;
let sessionVersion = 0;
let snapshot = unauthenticatedSnapshot;
const listeners = new Set<SessionListener>();

function notifySessionListeners(): void {
  listeners.forEach((listener) => listener());
}

function setSnapshot(nextSnapshot: SessionSnapshot): void {
  if (snapshot.status === nextSnapshot.status) {
    return;
  }

  snapshot = nextSnapshot;
  notifySessionListeners();
}

function replaceTokens(tokens: AuthTokens): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  setSnapshot(authenticatedSnapshot);
}

function isTerminalSessionError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || TERMINAL_REFRESH_ERROR_CODES.has(error.code))
  );
}

function isAccessTokenExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 401 &&
    error.code === "ACCESS_TOKEN_EXPIRED"
  );
}

async function rotateTokens(refreshSessionVersion: number): Promise<boolean> {
  const currentRefreshToken = refreshToken;

  if (!currentRefreshToken) {
    if (refreshSessionVersion === sessionVersion) {
      clearSession();
    }

    return false;
  }

  try {
    const tokens = await api.post<AuthTokens, { refreshToken: string }>(
      "/auth/refresh",
      { refreshToken: currentRefreshToken },
      { authentication: "none", retryOnAccessTokenExpired: false },
    );

    if (refreshSessionVersion !== sessionVersion) {
      return false;
    }

    replaceTokens(tokens);
    return true;
  } catch (error) {
    if (isTerminalSessionError(error)) {
      if (refreshSessionVersion === sessionVersion) {
        clearSession();
      }

      return false;
    }

    throw error;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshOperation || refreshOperation.sessionVersion !== sessionVersion) {
    const operationSessionVersion = sessionVersion;
    const promise = rotateTokens(operationSessionVersion).finally(() => {
      if (refreshOperation?.sessionVersion === operationSessionVersion) {
        refreshOperation = undefined;
      }
    });
    refreshOperation = {
      promise,
      sessionVersion: operationSessionVersion,
    };
  }

  return refreshOperation.promise;
}

export const authenticatedApi = new ApiClient({
  getAccessToken: () => accessToken,
  refreshAccessToken,
});

export function beginSession(tokens: AuthTokens): void {
  sessionVersion += 1;
  replaceTokens(tokens);
}

export function clearSession(): void {
  sessionVersion += 1;
  accessToken = undefined;
  refreshToken = undefined;
  setSnapshot(unauthenticatedSnapshot);
}

export async function logout(): Promise<void> {
  if (!refreshToken) {
    clearSession();
    return;
  }

  try {
    await revokeCurrentRefreshSession();
  } catch (error) {
    if (isAccessTokenExpiredError(error)) {
      const refreshed = await refreshAccessToken();

      if (!refreshed) {
        return;
      }

      try {
        await revokeCurrentRefreshSession();
      } catch (retryError) {
        if (isTerminalSessionError(retryError)) {
          clearSession();
          return;
        }

        throw retryError;
      }
    } else if (isTerminalSessionError(error)) {
      clearSession();
      return;
    } else {
      throw error;
    }
  }

  clearSession();
}

async function revokeCurrentRefreshSession(): Promise<void> {
  const currentRefreshToken = refreshToken;

  if (!currentRefreshToken) {
    clearSession();
    return;
  }

  await authenticatedApi.post<void, { refreshToken: string }>(
    "/auth/logout",
    { refreshToken: currentRefreshToken },
    { retryOnAccessTokenExpired: false },
  );
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}

export function subscribeToSession(listener: SessionListener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
