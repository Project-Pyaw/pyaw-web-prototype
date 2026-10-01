"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { getSessionVersion } from "@/features/auth/session/session";
import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

import { getPresence, type PresenceSnapshot } from "../api/presence-api";

const PRESENCE_BATCH_SIZE = 100;

type PresenceCache = Readonly<{
  entries: Readonly<Record<string, PresenceSnapshot>>;
  revisions: Readonly<Record<string, number>>;
}>;

const emptyPresenceCache: PresenceCache = { entries: {}, revisions: {} };

export const presenceQueryKey = ["presence"] as const;

export function presenceCacheQueryKey(
  accountId: string,
  sessionVersion: number,
) {
  return [...presenceQueryKey, "cache", accountId, sessionVersion] as const;
}

function presenceSnapshotQueryKey(
  accountId: string,
  sessionVersion: number,
  accountIds: readonly string[],
) {
  return [
    ...presenceQueryKey,
    "snapshot",
    accountId,
    sessionVersion,
    accountIds,
  ] as const;
}

function normalizeAccountIds(accountIds: readonly string[]): string[] {
  return [...new Set(accountIds.filter(Boolean))].toSorted();
}

function splitIntoBatches(accountIds: readonly string[]): string[][] {
  const batches: string[][] = [];

  for (let index = 0; index < accountIds.length; index += PRESENCE_BATCH_SIZE) {
    batches.push(accountIds.slice(index, index + PRESENCE_BATCH_SIZE));
  }

  return batches;
}

function isPresenceSnapshot(value: PresenceSnapshot): boolean {
  return (
    typeof value.accountId === "string" &&
    (value.status === "ONLINE" ||
      value.status === "OFFLINE" ||
      value.status === "UNKNOWN") &&
    (value.lastSeenAt === null ||
      (typeof value.lastSeenAt === "string" &&
        !Number.isNaN(Date.parse(value.lastSeenAt))))
  );
}

function getPresenceCache(cache: PresenceCache | undefined): PresenceCache {
  return cache ?? emptyPresenceCache;
}

function getServerPresenceCache(): PresenceCache | undefined {
  return undefined;
}

function nextRevision(cache: PresenceCache, accountId: string): number {
  return (cache.revisions[accountId] ?? 0) + 1;
}

export function applyPresenceUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  currentAccountId: string,
  presence: PresenceSnapshot,
): void {
  const sessionVersion = getSessionVersion();

  queryClient.setQueryData<PresenceCache>(
    presenceCacheQueryKey(currentAccountId, sessionVersion),
    (current) => {
      const cache = getPresenceCache(current);

      return {
        entries: { ...cache.entries, [presence.accountId]: presence },
        revisions: {
          ...cache.revisions,
          [presence.accountId]: nextRevision(cache, presence.accountId),
        },
      };
    },
  );
}

export function invalidatePresence(
  queryClient: ReturnType<typeof useQueryClient>,
  currentAccountId: string,
  accountId: string,
): void {
  const sessionVersion = getSessionVersion();

  queryClient.setQueryData<PresenceCache>(
    presenceCacheQueryKey(currentAccountId, sessionVersion),
    (current) => {
      const cache = getPresenceCache(current);
      const { [accountId]: _removed, ...entries } = cache.entries;

      return {
        entries,
        revisions: {
          ...cache.revisions,
          [accountId]: nextRevision(cache, accountId),
        },
      };
    },
  );
}

export function usePresenceSnapshots(
  accountIds: readonly string[],
  enabled = true,
) {
  const queryClient = useQueryClient();
  const { status } = useSessionStatus();
  const isAuthenticated = status === "authenticated";
  const currentProfile = useCurrentProfile(isAuthenticated);
  const currentAccountId = currentProfile.data?.account.id;
  const sessionVersion = getSessionVersion();
  const normalizedAccountIds = normalizeAccountIds(accountIds).filter(
    (accountId) => accountId !== currentAccountId,
  );
  const batches = splitIntoBatches(normalizedAccountIds);
  const cacheKey = useMemo(
    () =>
      currentAccountId
        ? presenceCacheQueryKey(currentAccountId, sessionVersion)
        : ([...presenceQueryKey, "cache", "unknown", sessionVersion] as const),
    [currentAccountId, sessionVersion],
  );
  const subscribeToPresenceCache = useCallback(
    (listener: () => void) => queryClient.getQueryCache().subscribe(listener),
    [queryClient],
  );
  const getPresenceCacheSnapshot = useCallback(
    () => queryClient.getQueryData<PresenceCache>(cacheKey),
    [cacheKey, queryClient],
  );
  const cache = useSyncExternalStore(
    subscribeToPresenceCache,
    getPresenceCacheSnapshot,
    getServerPresenceCache,
  );

  useQueries({
    queries: batches.map((batch) => ({
      enabled: enabled && isAuthenticated && Boolean(currentAccountId),
      queryFn: async () => {
        const accountId = currentAccountId;

        if (!accountId) {
          return [];
        }

        const expectedRevisions: Record<string, number> = {};

        queryClient.setQueryData<PresenceCache>(
          presenceCacheQueryKey(accountId, sessionVersion),
          (current) => {
            const cache = getPresenceCache(current);

            batch.forEach((id) => {
              expectedRevisions[id] = nextRevision(cache, id);
            });

            return {
              ...cache,
              revisions: { ...cache.revisions, ...expectedRevisions },
            };
          },
        );
        const snapshot = (await getPresence(batch)).filter(isPresenceSnapshot);

        queryClient.setQueryData<PresenceCache>(
          presenceCacheQueryKey(accountId, sessionVersion),
          (current) => {
            const currentCache = getPresenceCache(current);
            const entries = { ...currentCache.entries };

            batch.forEach((id) => {
              if (currentCache.revisions[id] !== expectedRevisions[id]) {
                return;
              }

              const presence = snapshot.find((item) => item.accountId === id);

              if (presence) {
                entries[id] = presence;
              } else {
                delete entries[id];
              }
            });

            return { ...currentCache, entries };
          },
        );

        return snapshot;
      },
      queryKey: currentAccountId
        ? presenceSnapshotQueryKey(currentAccountId, sessionVersion, batch)
        : ([
            ...presenceQueryKey,
            "snapshot",
            "unknown",
            sessionVersion,
            batch,
          ] as const),
      staleTime: 0,
    })),
  });

  return isAuthenticated
    ? (cache?.entries ?? emptyPresenceCache.entries)
    : emptyPresenceCache.entries;
}
