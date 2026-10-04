"use client";

import { useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import { useBlockedAccounts, useUnblockAccount } from "../hooks/use-blocks";
import type { AccountBlock } from "../types";

function BlockedUserSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="flex items-center gap-3 px-5 py-4 sm:px-6"
    >
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <Skeleton className="h-10 w-20 rounded-full" />
    </li>
  );
}

function BlockedUserRow({
  block,
  currentAccountId,
}: Readonly<{
  block: AccountBlock;
  currentAccountId: string;
}>) {
  const unblock = useUnblockAccount(currentAccountId);
  const isUnblockingRef = useRef(false);
  const [error, setError] = useState<string>();
  const identity = getProfileDisplayName(
    block.account.profile?.displayName,
    block.account.username,
  );

  function handleUnblock(): void {
    if (isUnblockingRef.current) {
      return;
    }

    isUnblockingRef.current = true;
    setError(undefined);
    unblock.mutate(block.account.id, {
      onError: () =>
        setError("Unable to unblock this person. Please try again."),
      onSettled: () => {
        isUnblockingRef.current = false;
      },
    });
  }

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <ProfileAvatar name={identity} url={null} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{identity}</p>
          {block.account.username ? (
            <p className="truncate text-sm text-foreground-muted">
              @{block.account.username}
            </p>
          ) : null}
        </div>
        <button
          className="min-h-10 shrink-0 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={unblock.isPending}
          onClick={handleUnblock}
          type="button"
        >
          {unblock.isPending ? "Unblocking…" : "Unblock"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function BlockedUsersSection({
  currentAccountId,
}: Readonly<{ currentAccountId: string }>) {
  const blockedAccounts = useBlockedAccounts(true);
  const blocks =
    blockedAccounts.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="blocked-users-title">
      <h2
        className="text-pretty text-3xl font-semibold tracking-tight text-foreground"
        id="blocked-users-title"
      >
        Blocked Users
      </h2>
      <p className="mt-1 max-w-2xl text-base text-foreground-muted">
        Manage people you have blocked. Unblocking does not restore a previous
        connection or chat access.
      </p>
      <div
        aria-busy={blockedAccounts.isPending}
        className="mt-8 overflow-hidden rounded-3xl border border-border bg-surface"
      >
        {blockedAccounts.isPending ? (
          <ul>
            <BlockedUserSkeleton />
            <BlockedUserSkeleton />
            <BlockedUserSkeleton />
          </ul>
        ) : null}
        {blockedAccounts.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <p className="text-sm text-danger" role="alert">
              Blocked users are unavailable. Check your connection and try
              again.
            </p>
            <button
              className="min-h-10 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => void blockedAccounts.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
        {!blockedAccounts.isPending &&
        !blockedAccounts.isError &&
        blocks.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="font-semibold text-foreground">No blocked users</p>
            <p className="mt-1 text-sm text-foreground-muted">
              People you block from their profile will appear here.
            </p>
          </div>
        ) : null}
        {blocks.length > 0 ? (
          <ul className="divide-y divide-border">
            {blocks.map((block) => (
              <BlockedUserRow
                block={block}
                currentAccountId={currentAccountId}
                key={block.id}
              />
            ))}
          </ul>
        ) : null}
      </div>
      {blockedAccounts.hasNextPage ? (
        <button
          className="mt-5 min-h-11 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={blockedAccounts.isFetchingNextPage}
          onClick={() => void blockedAccounts.fetchNextPage()}
          type="button"
        >
          {blockedAccounts.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
