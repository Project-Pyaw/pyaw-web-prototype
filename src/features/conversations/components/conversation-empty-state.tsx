"use client";

import { useRouter } from "next/navigation";

import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";
import { MessageComposer } from "@/features/messages/components/message-composer";
import { MessageHistory } from "@/features/messages/components/message-history";
import { useConversationTyping } from "@/features/messages/hooks/use-conversation-typing";
import { useCounterpartPresence } from "@/features/messages/hooks/use-counterpart-presence";
import { useSendMessage } from "@/features/messages/hooks/use-send-message";

import { formatLastSeen } from "../conversation-presentation";
import { useMarkConversationRead } from "../hooks/use-mark-conversation-read";

import type { ConversationListItem } from "../types";

type ConversationEmptyStateProps = Readonly<{
  conversation?: ConversationListItem;
  currentAccountId: string;
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
  currentAccountId,
  isLoading,
  selectedConversationId,
  self,
}: ConversationEmptyStateProps) {
  const router = useRouter();
  const isSelf = conversation?.type === "SELF";
  const identity = conversation
    ? isSelf
      ? (conversation.self?.label ?? "Notes")
      : getProfileDisplayName(
          conversation.counterpart?.profile?.displayName,
          conversation.counterpart?.username,
        )
    : null;
  const messageSending = useSendMessage(conversation?.id ?? "");
  const markConversationRead = useMarkConversationRead();
  const typing = useConversationTyping({
    conversationId: conversation?.id ?? "",
    conversationType: isSelf ? "SELF" : "DIRECT",
    currentAccountId,
  });
  const presence = useCounterpartPresence(
    isSelf ? undefined : conversation?.counterpart?.accountId,
  );
  const secondaryText = isSelf
    ? "Notes to yourself"
    : typing.isCounterpartTyping
      ? "typing…"
      : presence?.status === "ONLINE"
        ? "Online"
        : presence?.status === "OFFLINE" && presence.lastSeenAt
          ? (formatLastSeen(presence.lastSeenAt) ??
            (conversation?.counterpart?.username
              ? `@${conversation.counterpart.username}`
              : ""))
          : conversation?.counterpart?.username
            ? `@${conversation.counterpart.username}`
            : "";

  if (!conversation || !identity) {
    return (
      <section className="grid min-h-0 flex-1 place-items-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-sm font-semibold tracking-wide text-primary">
            Pyaw
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            {isLoading
              ? "Loading conversations…"
              : selectedConversationId
                ? "Conversation unavailable"
                : "Select a conversation"}
          </h2>
          {selectedConversationId ? (
            <button
              className="min-h-10 rounded-lg px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
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
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-[4.5rem] items-center gap-3 border-b border-border px-3 py-3 sm:px-5">
        <button
          aria-label="Back to chats"
          className="min-h-10 rounded-lg px-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 md:hidden"
          onClick={() => router.push("/chat")}
          type="button"
        >
          Back
        </button>
        {!isSelf ? (
          <ProfileAvatar
            name={identity}
            size="header"
            url={conversation.counterpart?.profile?.avatar ?? null}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold leading-5 text-foreground">
            {identity}
          </h2>
          <p
            aria-live="polite"
            className="min-h-5 truncate text-sm text-foreground-muted"
          >
            {secondaryText}
          </p>
        </div>
      </header>
      <MessageHistory
        conversationId={conversation.id}
        conversationType={isSelf ? "SELF" : "DIRECT"}
        counterpart={
          isSelf
            ? undefined
            : {
                avatar: conversation.counterpart?.profile?.avatar ?? null,
                name: identity,
              }
        }
        currentAccountId={currentAccountId}
        onReadIncoming={(messageId) =>
          markConversationRead.markRead(conversation.id, messageId)
        }
        onRetry={messageSending.retry}
      />
      <MessageComposer
        onContentChange={typing.onDraftChange}
        onSend={messageSending.send}
      />
    </section>
  );
}
