"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";
import { usePresenceSnapshots } from "@/features/messages/hooks/use-presence-snapshots";
import type { PresenceSnapshot } from "@/features/messages/api/presence-api";

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
  presenceStatus,
  selected,
}: Readonly<{
  conversation: ConversationListItem;
  notes?: boolean;
  presenceStatus?: PresenceSnapshot["status"];
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
      className={`relative flex min-h-[4.75rem] w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 motion-reduce:transition-none ${
        selected
          ? "bg-surface-muted before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-primary"
          : "hover:bg-surface-muted"
      }`}
      onClick={() => router.push(`/chat/${conversation.id}`)}
      type="button"
    >
      <ProfileAvatar
        name={identity}
        presenceStatus={presenceStatus}
        url={
          isSelf ? null : (conversation.counterpart?.profile?.avatar ?? null)
        }
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`truncate ${unreadCount > 0 ? "font-bold" : "font-semibold"} text-foreground`}
          >
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
          <span
            className={`block truncate text-sm ${unreadCount > 0 ? "font-semibold text-foreground" : "text-foreground-muted"}`}
          >
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
  const [filter, setFilter] = useState<"all" | "unread">("all");
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
  const presence = usePresenceSnapshots(
    directConversations.flatMap((conversation) =>
      conversation.counterpart?.accountId
        ? [conversation.counterpart.accountId]
        : [],
    ),
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
  const unreadConversations = visibleConversations.filter(
    (conversation) => conversation.readState.unreadCount > 0,
  );
  const filteredConversations =
    filter === "unread" ? unreadConversations : visibleConversations;

  function handleOpenSelf() {
    openSelf.mutate(undefined, {
      onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
    });
  }

  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="space-y-3 border-b border-border px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Chats
          </h1>
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full text-xl font-light text-foreground-muted"
          >
            +
          </span>
        </div>
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
            className="min-h-11 w-full rounded-full border border-border bg-input py-2 pl-10 pr-9 text-base text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
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
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Conversation filters"
        >
          <button
            aria-pressed={filter === "all"}
            className={`min-h-8 rounded-full px-3 text-sm font-semibold transition-colors ${filter === "all" ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-surface-muted"}`}
            onClick={() => setFilter("all")}
            type="button"
          >
            All
          </button>
          <button
            aria-pressed={filter === "unread"}
            className={`min-h-8 rounded-full px-3 text-sm font-medium transition-colors ${filter === "unread" ? "bg-primary/5 text-primary" : "text-foreground-muted hover:bg-surface-muted"}`}
            onClick={() => setFilter("unread")}
            type="button"
          >
            Unread
            {unreadConversations.length > 0 ? (
              <span className="ml-1.5 inline-grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {unreadConversations.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      {notesMatches ? (
        <section className="px-3 py-3" aria-label="Notes">
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
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2"
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
            {normalizedSearch ? "Search results" : "Recent conversations"}
          </h2>
          {!normalizedSearch ? (
            <span className="text-xs font-medium text-foreground-muted">
              {directConversations.length} chats
            </span>
          ) : null}
        </div>
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
        filteredConversations.length === 0 ? (
          <p className="px-3 py-4 text-sm text-foreground-muted">
            {normalizedSearch
              ? conversationsQuery.hasNextPage
                ? "No matching loaded chats. Load more may include other conversations."
                : "No matching chats."
              : "No conversations yet."}
          </p>
        ) : null}
        {filteredConversations.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            presenceStatus={
              conversation.counterpart?.accountId
                ? presence[conversation.counterpart.accountId]?.status
                : undefined
            }
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
