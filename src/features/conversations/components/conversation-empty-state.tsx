"use client";

import { useRouter } from "next/navigation";

import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import type { ConversationListItem } from "../types";

type ConversationEmptyStateProps = Readonly<{
  conversation?: ConversationListItem;
  isLoading: boolean;
  selectedConversationId?: string;
  self: Readonly<{
    displayName: string | null;
    username: string | null;
    avatar: string | null;
  }>;
}>;

export function ConversationEmptyState({
  conversation,
  isLoading,
  selectedConversationId,
  self,
}: ConversationEmptyStateProps) {
  const router = useRouter();
  const isSelf = conversation?.type === "SELF";
  const identity = conversation
    ? isSelf
      ? (conversation.self?.label ?? "Saved Messages")
      : getProfileDisplayName(
          conversation.counterpart?.profile?.displayName,
          conversation.counterpart?.username,
        )
    : null;

  if (!conversation || !identity) {
    return (
      <section className="grid flex-1 place-items-center p-6 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {isLoading
              ? "Loading conversations…"
              : selectedConversationId
                ? "Conversation unavailable"
                : "Select a conversation"}
          </h2>
          {selectedConversationId ? (
            <button
              className="text-sm font-medium text-primary"
              onClick={() => router.push("/chat")}
              type="button"
            >
              Back to chats
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <button
          aria-label="Back to chats"
          className="text-sm font-medium text-primary md:hidden"
          onClick={() => router.push("/chat")}
          type="button"
        >
          Back
        </button>
        <ProfileAvatar
          name={identity}
          url={
            isSelf
              ? self.avatar
              : (conversation.counterpart?.profile?.avatar ?? null)
          }
        />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground">{identity}</h2>
          {!isSelf && conversation.counterpart?.username ? (
            <p className="truncate text-sm text-foreground-muted">
              @{conversation.counterpart.username}
            </p>
          ) : null}
        </div>
      </header>
      <div className="grid flex-1 place-items-center p-6 text-center">
        <p className="text-sm text-foreground-muted">
          Messages are coming soon.
        </p>
      </div>
    </section>
  );
}
