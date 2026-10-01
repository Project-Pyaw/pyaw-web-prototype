import "client-only";

import { ApiError } from "@/lib/api/api-error";
import { api, ApiClient } from "@/lib/api/client";

export type AccessTokenSession = Readonly<{
  accessToken: string;
}>;

type SessionStatus = "initializing" | "authenticated" | "unauthenticated";

export type SessionSnapshot = Readonly<{
  bootstrapError: boolean;
  status: SessionStatus;
}>;

type SessionListener = () => void;

type RefreshOperation = Readonly<{
  promise: Promise<boolean>;
  sessionVersion: number;
}>;

type BootstrapOperation = Readonly<{
  promise: Promise<void>;
}>;

const initializingSnapshot: SessionSnapshot = {
  bootstrapError: false,
  status: "initializing",
};
const unauthenticatedSnapshot: SessionSnapshot = {
  bootstrapError: false,
  status: "unauthenticated",
};
const bootstrapRetrySnapshot: SessionSnapshot = {
  bootstrapError: true,
  status: "initializing",
};
const authenticatedSnapshot: SessionSnapshot = {
  bootstrapError: false,
  status: "authenticated",
};

let accessToken: string | undefined;
let bootstrapOperation: BootstrapOperation | undefined;
let logoutOperation: Promise<void> | undefined;
let refreshOperation: RefreshOperation | undefined;
let sessionVersion = 0;
let snapshot = initializingSnapshot;
const listeners = new Set<SessionListener>();

function notifySessionListeners(): void {
  listeners.forEach((listener) => listener());
}

function setSnapshot(nextSnapshot: SessionSnapshot): void {
  if (
    snapshot.status === nextSnapshot.status &&
    snapshot.bootstrapError === nextSnapshot.bootstrapError
  ) {
    return;
  }

  snapshot = nextSnapshot;
}

function replaceAccessToken(session: AccessTokenSession): void {
  accessToken = session.accessToken;
  setSnapshot(authenticatedSnapshot);
  notifySessionListeners();
}

function isTerminalRefreshError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 400 || error.status === 401)
  );
}

function isAccessTokenExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 401 &&
    error.code === "ACCESS_TOKEN_EXPIRED"
  );
}

function isAccessTokenSession(value: AccessTokenSession): boolean {
  return typeof value.accessToken === "string" && value.accessToken.length > 0;
}

async function requestCookieRefresh(): Promise<AccessTokenSession> {
  const session = await api.post<AccessTokenSession, undefined>(
    "/auth/refresh",
    undefined,
    {
      authentication: "none",
      credentials: "include",
      retryOnAccessTokenExpired: false,
    },
  );

  if (!isAccessTokenSession(session)) {
    throw new ApiError({
      code: "INVALID_RESPONSE",
      message: "The service returned an invalid response.",
      status: 200,
    });
  }

  return session;
}

async function rotateAccessToken(
  refreshSessionVersion: number,
): Promise<boolean> {
  try {
    const session = await requestCookieRefresh();

    if (refreshSessionVersion !== sessionVersion) {
      return false;
    }

    replaceAccessToken(session);
    return true;
  } catch (error) {
    if (isTerminalRefreshError(error)) {
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
    const promise = rotateAccessToken(operationSessionVersion).finally(() => {
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

export function beginSession(session: AccessTokenSession): void {
  sessionVersion += 1;
  replaceAccessToken(session);
}

export function clearSession(): void {
  sessionVersion += 1;
  accessToken = undefined;
  setSnapshot(unauthenticatedSnapshot);
  notifySessionListeners();
}

export function bootstrapSession(): Promise<void> {
  if (!bootstrapOperation) {
    const promise = (async () => {
      const bootstrapSessionVersion = sessionVersion;
      setSnapshot(initializingSnapshot);
      notifySessionListeners();

      try {
        const session = await requestCookieRefresh();
        if (bootstrapSessionVersion !== sessionVersion) {
          return;
        }

        beginSession(session);
      } catch (error) {
        if (bootstrapSessionVersion !== sessionVersion) {
          return;
        }

        if (isTerminalRefreshError(error)) {
          clearSession();
          return;
        }

        setSnapshot(bootstrapRetrySnapshot);
        notifySessionListeners();
      }
    })().finally(() => {
      bootstrapOperation = undefined;
    });

    bootstrapOperation = { promise };
  }

  return bootstrapOperation.promise;
}

async function performLogout(): Promise<void> {
  try {
    await authenticatedApi.post<void, undefined>("/auth/logout", undefined, {
      credentials: "include",
      retryOnAccessTokenExpired: false,
    });
  } catch (error) {
    if (isAccessTokenExpiredError(error)) {
      try {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          await authenticatedApi.post<void, undefined>(
            "/auth/logout",
            undefined,
            {
              credentials: "include",
              retryOnAccessTokenExpired: false,
            },
          );
        }
      } catch {
        // Local cleanup below is required even when the refresh or retry fails.
      }
    }
  } finally {
    clearSession();
  }
}

export function logout(): Promise<void> {
  if (!logoutOperation) {
    logoutOperation = performLogout().finally(() => {
      logoutOperation = undefined;
    });
  }

  return logoutOperation;
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}

export function getCurrentAccessToken(): string | undefined {
  return accessToken;
}

export function getSessionVersion(): number {
  return sessionVersion;
}

export function subscribeToSession(listener: SessionListener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
