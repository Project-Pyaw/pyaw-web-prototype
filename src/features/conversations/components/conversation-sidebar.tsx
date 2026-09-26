"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import {
  useConversations,
  useOpenSelfConversation,
} from "../hooks/use-conversations";
import { formatConversationActivity } from "../conversation-presentation";
import type { ConversationListItem } from "../types";

type ConversationSidebarProps = Readonly<{
  selectedConversationId?: string;
  self: Readonly<{
    displayName: string | null;
    username: string | null;
    avatar: string | null;
  }>;
}>;

function getPreview(conversation: ConversationListItem): string | null {
  if (!conversation.latestMessage) {
    return null;
  }

  const content = conversation.latestMessage.content
    ?.replace(/\s+/g, " ")
    .trim();

  return content || null;
}

function ConversationRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-16 items-center gap-3 px-3 py-3"
    >
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5 rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
      </div>
      <Skeleton className="h-3 w-10 shrink-0 rounded" />
    </div>
  );
}

function ConversationRow({
  conversation,
  notes = false,
  selected,
}: Readonly<{
  conversation: ConversationListItem;
  notes?: boolean;
  selected: boolean;
}>) {
  const router = useRouter();
  const isSelf = conversation.type === "SELF";
  const identity = isSelf
    ? (conversation.self?.label ?? "Notes")
    : getProfileDisplayName(
        conversation.counterpart?.profile?.displayName,
        conversation.counterpart?.username,
      );
  const preview = notes ? "Notes to yourself" : getPreview(conversation);
  const activity = notes
    ? null
    : formatConversationActivity(conversation.activityAt);
  const unreadCount = conversation.readState.unreadCount;

  return (
    <button
      aria-current={selected ? "page" : undefined}
      className={`flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 motion-reduce:transition-none ${
        selected
          ? "bg-surface-muted shadow-[inset_3px_0_0_var(--pyaw-primary)]"
          : "hover:bg-surface-muted"
      }`}
      onClick={() => router.push(`/chat/${conversation.id}`)}
      type="button"
    >
      <ProfileAvatar
        name={identity}
        url={
          isSelf ? null : (conversation.counterpart?.profile?.avatar ?? null)
        }
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {identity}
          </span>
          <span className="ml-auto flex shrink-0 flex-col items-end gap-1">
            {activity ? (
              <time
                className="text-xs text-foreground-muted"
                dateTime={conversation.activityAt}
              >
                {activity}
              </time>
            ) : null}
            {unreadCount > 0 ? (
              <span
                aria-label={`${unreadCount} unread ${unreadCount === 1 ? "message" : "messages"}`}
                className="grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </span>
        </span>
        {preview ? (
          <span className="block truncate text-sm text-foreground-muted">
            {preview}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function ConversationSidebar({
  selectedConversationId,
  self,
}: ConversationSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const conversationsQuery = useConversations(true);
  const openSelf = useOpenSelfConversation();
  const items =
    conversationsQuery.data?.pages.flatMap((page) =>
      page.items.filter(
        (conversation) =>
          conversation.type === "DIRECT" || conversation.type === "SELF",
      ),
    ) ?? [];
  const notes = items.find((conversation) => conversation.type === "SELF");
  const directConversations = items.filter(
    (conversation) => conversation.type === "DIRECT",
  );
  const identity = getProfileDisplayName(self.displayName, self.username);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const notesMatches =
    !normalizedSearch || "notes notes to yourself".includes(normalizedSearch);
  const visibleConversations = normalizedSearch
    ? directConversations.filter((conversation) => {
        const counterpart = conversation.counterpart;
        const displayName = counterpart?.profile?.displayName ?? "";
        const username = counterpart?.username ?? "";

        return `${displayName} ${username}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      })
    : directConversations;

  function handleOpenSelf() {
    openSelf.mutate(undefined, {
      onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
    });
  }

  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="space-y-3 border-b border-border px-4 pb-3 pt-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Chats
        </h1>
        <div className="relative">
          <label className="sr-only" htmlFor="conversation-search">
            Search chats
          </label>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="11"
              cy="11"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
          <input
            className="min-h-10 w-full rounded-lg border border-border bg-input py-2 pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
            id="conversation-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSearchQuery("");
              }
            }}
            placeholder="Search chats"
            type="search"
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              aria-label="Clear chat search"
              className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-foreground-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          ) : null}
        </div>
      </div>
      {notesMatches ? (
        <section
          className="border-b border-border px-3 py-3"
          aria-label="Notes"
        >
          {notes ? (
            <ConversationRow
              conversation={notes}
              notes
              selected={notes.id === selectedConversationId}
            />
          ) : (
            <button
              className="flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              disabled={openSelf.isPending}
              onClick={handleOpenSelf}
              type="button"
            >
              <ProfileAvatar name={identity} url={self.avatar} />
              <span className="min-w-0">
                <span className="block font-medium text-foreground">Notes</span>
                <span className="block text-sm text-foreground-muted">
                  Notes to yourself
                </span>
              </span>
            </button>
          )}
          {openSelf.isError ? (
            <p className="px-3 pt-2 text-sm text-danger" role="alert">
              Notes is unavailable.
            </p>
          ) : null}
        </section>
      ) : null}
      <div
        aria-busy={conversationsQuery.isPending}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2"
      >
        <h2 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {normalizedSearch ? "Search results" : "Recent conversations"}
        </h2>
        {conversationsQuery.isPending ? (
          <>
            <span className="sr-only" role="status">
              Loading chats…
            </span>
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
          </>
        ) : null}
        {conversationsQuery.isError ? (
          <div className="space-y-2 px-3 py-4" role="alert">
            <p className="text-sm text-danger">
              Conversations are unavailable right now.
            </p>
            <button
              className="min-h-10 rounded-lg px-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => conversationsQuery.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
        {!conversationsQuery.isPending &&
        !conversationsQuery.isError &&
        visibleConversations.length === 0 ? (
          <p className="px-3 py-4 text-sm text-foreground-muted">
            {normalizedSearch
              ? conversationsQuery.hasNextPage
                ? "No matching loaded chats. Load more may include other conversations."
                : "No matching chats."
              : "No conversations yet."}
          </p>
        ) : null}
        {visibleConversations.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            selected={conversation.id === selectedConversationId}
          />
        ))}
        {conversationsQuery.hasNextPage ? (
          <button
            className="mt-2 min-h-10 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            disabled={conversationsQuery.isFetchingNextPage}
            onClick={() => conversationsQuery.fetchNextPage()}
            type="button"
          >
            {conversationsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
