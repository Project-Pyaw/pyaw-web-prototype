"use client";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";
import {
  getMessagesSocketConnectionState,
  startMessagesSocket,
  stopMessagesSocket,
  subscribeToMessageNew,
  subscribeToMessageUpdated,
  subscribeToMessageDeleted,
  subscribeToMessageReactionsUpdated,
  subscribeToConversationRead,
  subscribeToConversationChanged,
  subscribeToMessagesSocketConnectionState,
  subscribeToPresenceInvalidate,
  subscribeToPresenceUpdate,
} from "@/lib/socket/messages-socket";

import {
  applyReadReceipt,
  applyMessageDeleted,
  applyMessageReactionUpdate,
  mergePersistedMessage,
  redactReplyPreviews,
} from "../message-cache";
import type { MessageHistoryPage } from "../types";
import {
  messageHistoryQueryKey,
  messagesQueryKey,
} from "../hooks/use-message-history";
import { mapMessageNewEvent } from "./message-new";
import { mapConversationReadEvent } from "./conversation-read";
import { mapConversationChangedEvent } from "@/features/conversations/realtime/conversation-changed";
import { mapMessageDeletedEvent } from "./message-deleted";
import { mapMessageReactionsUpdatedEvent } from "./message-reactions-updated";
import { mapPresenceInvalidateEvent } from "./presence-invalidate";
import { mapPresenceUpdateEvent } from "./presence-update";
import {
  applyPresenceUpdate,
  invalidatePresence,
  presenceQueryKey,
} from "../hooks/use-presence-snapshots";

export function MessagesRealtimeSync() {
  const { status } = useSessionStatus();
  const queryClient = useQueryClient();
  const currentProfile = useCurrentProfile(status === "authenticated");
  const currentAccountId = currentProfile.data?.account.id;

  useEffect(() => {
    if (status !== "authenticated") {
      stopMessagesSocket();
      return;
    }

    const unsubscribeMessageNew = subscribeToMessageNew((payload) => {
      const message = mapMessageNewEvent(payload);

      if (!message) {
        return;
      }

      const queryKey = messageHistoryQueryKey(message.conversationId);

      if (
        queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
      ) {
        queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
          queryKey,
          (data) => mergePersistedMessage(data, message),
        );
      }

      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    });
    const unsubscribeConversationRead = subscribeToConversationRead(
      (payload) => {
        const receipt = mapConversationReadEvent(payload);

        if (!receipt) {
          return;
        }

        const queryKey = messageHistoryQueryKey(receipt.conversationId);

        if (
          queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
        ) {
          queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
            queryKey,
            (data) => applyReadReceipt(data, receipt),
          );
        }

        queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      },
    );
    const unsubscribeConversationChanged = subscribeToConversationChanged(
      (payload) => {
        const change = mapConversationChangedEvent(payload);

        if (!change) {
          return;
        }

        // GROUP membership and metadata are server-authoritative. Invalidate
        // rather than reconstructing state from a best-effort socket event.
        queryClient.invalidateQueries({
          queryKey: conversationsQueryKey,
          refetchType: "active",
        });
        queryClient.invalidateQueries({
          queryKey: messageHistoryQueryKey(change.conversationId),
          refetchType: "active",
        });
      },
    );
    const unsubscribeMessageUpdated = subscribeToMessageUpdated((payload) => {
      const message = mapMessageNewEvent(payload);

      if (!message) {
        return;
      }

      const queryKey = messageHistoryQueryKey(message.conversationId);

      if (
        queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
      ) {
        queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
          queryKey,
          (data) => mergePersistedMessage(data, message),
        );
      }

      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    });
    const unsubscribeMessageDeleted = subscribeToMessageDeleted((payload) => {
      const deletedMessage = mapMessageDeletedEvent(payload);

      if (!deletedMessage) {
        return;
      }

      const queryKey = messageHistoryQueryKey(deletedMessage.conversationId);

      if (
        queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
      ) {
        queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
          queryKey,
          (data) =>
            redactReplyPreviews(
              applyMessageDeleted(data, deletedMessage),
              deletedMessage.id,
            ),
        );
      }

      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    });
    const unsubscribeMessageReactionsUpdated =
      subscribeToMessageReactionsUpdated((payload) => {
        const update = mapMessageReactionsUpdatedEvent(payload);

        if (!update || !currentAccountId) {
          return;
        }

        const queryKey = messageHistoryQueryKey(update.conversationId);

        if (
          queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
        ) {
          queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
            queryKey,
            (data) =>
              applyMessageReactionUpdate(data, update, currentAccountId),
          );
        }
      });
    const unsubscribePresenceUpdate = subscribeToPresenceUpdate((payload) => {
      const presence = mapPresenceUpdateEvent(payload);

      if (presence && currentAccountId) {
        applyPresenceUpdate(queryClient, currentAccountId, presence);
      }
    });
    const unsubscribePresenceInvalidate = subscribeToPresenceInvalidate(
      (payload) => {
        const invalidation = mapPresenceInvalidateEvent(payload);

        if (invalidation && currentAccountId) {
          invalidatePresence(
            queryClient,
            currentAccountId,
            invalidation.accountId,
          );
        }
      },
    );
    const unsubscribeConnectionState = subscribeToMessagesSocketConnectionState(
      () => {
        if (getMessagesSocketConnectionState() !== "connected") {
          return;
        }

        queryClient.invalidateQueries({
          queryKey: messagesQueryKey,
          refetchType: "active",
        });
        queryClient.invalidateQueries({
          queryKey: conversationsQueryKey,
          refetchType: "active",
        });
        queryClient.invalidateQueries({
          queryKey: presenceQueryKey,
          refetchType: "active",
        });
      },
    );

    startMessagesSocket();

    return () => {
      unsubscribeMessageNew();
      unsubscribeConversationRead();
      unsubscribeConversationChanged();
      unsubscribeMessageUpdated();
      unsubscribeMessageDeleted();
      unsubscribeMessageReactionsUpdated();
      unsubscribePresenceUpdate();
      unsubscribePresenceInvalidate();
      unsubscribeConnectionState();
      stopMessagesSocket();
    };
  }, [currentAccountId, queryClient, status]);

  return null;
}
