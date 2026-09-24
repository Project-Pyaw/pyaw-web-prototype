"use client";

import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api/api-error";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import {
  useConversations,
  useOpenSelfConversation,
} from "../hooks/use-conversations";
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

  return (
    conversation.latestMessage.content ??
    (conversation.latestMessage.hasAttachments ? "Attachment" : null)
  );
}

function ConversationRow({
  conversation,
  selected,
}: Readonly<{
  conversation: ConversationListItem;
  selected: boolean;
}>) {
  const router = useRouter();
  const isSelf = conversation.type === "SELF";
  const identity = isSelf
    ? (conversation.self?.label ?? "Saved Messages")
    : getProfileDisplayName(
        conversation.counterpart?.profile?.displayName,
        conversation.counterpart?.username,
      );
  const preview = getPreview(conversation);

  return (
    <button
      aria-current={selected ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
        selected ? "bg-surface-muted" : "hover:bg-surface-muted"
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
          {conversation.readState.unreadCount > 0 ? (
            <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {conversation.readState.unreadCount}
            </span>
          ) : null}
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
  const conversations = useConversations(true);
  const openSelf = useOpenSelfConversation();
  const items =
    conversations.data?.pages.flatMap((page) =>
      page.items.filter(
        (conversation) =>
          conversation.type === "DIRECT" || conversation.type === "SELF",
      ),
    ) ?? [];
  const identity = getProfileDisplayName(self.displayName, self.username);

  function handleOpenSelf() {
    openSelf.mutate(undefined, {
      onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
    });
  }

  return (
    <aside className="flex min-h-0 flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Chats
        </h1>
      </div>
      <div className="border-b border-border p-3">
        <button
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          disabled={openSelf.isPending}
          onClick={handleOpenSelf}
          type="button"
        >
          <ProfileAvatar name={identity} url={self.avatar} />
          <span className="min-w-0">
            <span className="block font-medium text-foreground">
              Saved Messages
            </span>
            <span className="block text-sm text-foreground-muted">
              Keep notes for yourself
            </span>
          </span>
        </button>
        {openSelf.isError ? (
          <p className="px-3 pt-2 text-sm text-danger" role="alert">
            {openSelf.error instanceof ApiError
              ? openSelf.error.message
              : "Saved Messages is unavailable."}
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {conversations.isPending ? (
          <p className="px-3 py-4 text-sm text-foreground-muted">
            Loading chats…
          </p>
        ) : null}
        {conversations.isError ? (
          <p className="px-3 py-4 text-sm text-danger" role="alert">
            Conversations are unavailable right now.
          </p>
        ) : null}
        {!conversations.isPending &&
        !conversations.isError &&
        items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-foreground-muted">
            No conversations yet.
          </p>
        ) : null}
        {items.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            selected={conversation.id === selectedConversationId}
          />
        ))}
        {conversations.hasNextPage ? (
          <button
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={conversations.isFetchingNextPage}
            onClick={() => conversations.fetchNextPage()}
            type="button"
          >
            {conversations.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
