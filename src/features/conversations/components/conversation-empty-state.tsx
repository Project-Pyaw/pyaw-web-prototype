"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";
import { MessageComposer } from "@/features/messages/components/message-composer";
import { MessageHistory } from "@/features/messages/components/message-history";
import { useConversationTyping } from "@/features/messages/hooks/use-conversation-typing";
import { useCounterpartPresence } from "@/features/messages/hooks/use-counterpart-presence";
import { useSendMessage } from "@/features/messages/hooks/use-send-message";
import { mapMessageDeletedEvent } from "@/features/messages/realtime/message-deleted";
import type {
  MessageHistoryItem,
  ReplyMessagePreview,
} from "@/features/messages/types";
import { subscribeToMessageDeleted } from "@/lib/socket/messages-socket";

import {
  formatLastSeen,
  SELF_CONVERSATION_DESCRIPTION,
  SELF_CONVERSATION_TITLE,
} from "../conversation-presentation";
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
  const [replyTo, setReplyTo] = useState<ReplyMessagePreview | null>(null);
  const conversationId = conversation?.id;
  const isSelf = conversation?.type === "SELF";
  const isGroup = conversation?.type === "GROUP";
  const identity = conversation
    ? isSelf
      ? SELF_CONVERSATION_TITLE
      : isGroup
        ? (conversation.title ?? "Untitled group")
        : getProfileDisplayName(
            conversation.counterpart?.profile?.displayName,
            conversation.counterpart?.username,
          )
    : null;
  const messageSending = useSendMessage(conversation?.id ?? "");
  const markConversationRead = useMarkConversationRead();
  const typing = useConversationTyping({
    conversationId: conversation?.id ?? "",
    conversationType: conversation?.type ?? "SELF",
    currentAccountId,
  });
  const presence = useCounterpartPresence(
    !isSelf && !isGroup ? conversation?.counterpart?.accountId : undefined,
    !isSelf && !isGroup,
  );
  const lastSeen =
    presence?.status === "OFFLINE" && presence.lastSeenAt
      ? formatLastSeen(presence.lastSeenAt)
      : null;
  const secondaryText = isSelf
    ? SELF_CONVERSATION_DESCRIPTION
    : isGroup
      ? typing.isCounterpartTyping
        ? "Someone is typing…"
        : `${conversation?.memberCount ?? 0} members`
      : typing.isCounterpartTyping
        ? "typing…"
        : presence?.status === "ONLINE"
          ? "Online"
          : lastSeen
            ? `${lastSeen}`
            : conversation?.counterpart?.username
              ? `@${conversation.counterpart.username}`
              : "";

  useEffect(() => {
    setReplyTo(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    return subscribeToMessageDeleted((payload) => {
      const deletedMessage = mapMessageDeletedEvent(payload);

      if (!deletedMessage || deletedMessage.conversationId !== conversationId) {
        return;
      }

      setReplyTo((currentReplyTo) =>
        currentReplyTo?.messageId === deletedMessage.id
          ? {
              ...currentReplyTo,
              content: null,
              deleted: true,
              hasAttachments: false,
            }
          : currentReplyTo,
      );
    });
  }, [conversationId]);

  function selectReplyTarget(message: MessageHistoryItem) {
    setReplyTo({
      messageId: message.id,
      type: message.type,
      sender: message.sender,
      content: message.content,
      hasAttachments: message.attachments.length > 0,
      deleted: message.deletedAt !== null,
    });
  }

  function redactReplyTarget(messageId: string) {
    setReplyTo((currentReplyTo) =>
      currentReplyTo?.messageId === messageId
        ? {
            ...currentReplyTo,
            content: null,
            deleted: true,
            hasAttachments: false,
          }
        : currentReplyTo,
    );
  }

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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex min-h-[4.75rem] items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
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
              presenceStatus={isGroup ? undefined : presence?.status}
              size="header"
              url={
                isGroup
                  ? conversation.avatar
                  : (conversation.counterpart?.profile?.avatar ?? null)
              }
            />
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold leading-5 text-foreground">
              {identity}
            </h2>
            <p
              aria-live="polite"
              className={`mt-1 flex min-h-5 items-center gap-1.5 truncate text-sm ${typing.isCounterpartTyping ? "text-primary" : "text-foreground-muted"}`}
            >
              <span className="truncate">{secondaryText}</span>
            </p>
          </div>
        </div>
      </header>
      <MessageHistory
        conversationId={conversation.id}
        conversationType={conversation.type}
        counterpart={
          isSelf || isGroup
            ? undefined
            : {
                avatar: conversation.counterpart?.profile?.avatar ?? null,
                presenceStatus: presence?.status,
                name: identity,
              }
        }
        currentAccountId={currentAccountId}
        onMessageDeleted={redactReplyTarget}
        onReadIncoming={(messageId) =>
          markConversationRead.markRead(conversation.id, messageId)
        }
        onRetry={messageSending.retry}
        onReply={selectReplyTarget}
      />
      <MessageComposer
        onContentChange={typing.onDraftChange}
        onCancelReply={() => setReplyTo(null)}
        onSend={messageSending.send}
        replyTo={replyTo}
      />
    </section>
  );
}
