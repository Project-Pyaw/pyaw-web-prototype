"use client";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";
import {
  getMessagesSocketConnectionState,
  startMessagesSocket,
  stopMessagesSocket,
  subscribeToMessageNew,
  subscribeToConversationRead,
  subscribeToMessagesSocketConnectionState,
} from "@/lib/socket/messages-socket";

import { applyReadReceipt, mergePersistedMessage } from "../message-cache";
import type { MessageHistoryPage } from "../types";
import {
  messageHistoryQueryKey,
  messagesQueryKey,
} from "../hooks/use-message-history";
import { mapMessageNewEvent } from "./message-new";
import { mapConversationReadEvent } from "./conversation-read";

export function MessagesRealtimeSync() {
  const { status } = useSessionStatus();
  const queryClient = useQueryClient();

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
      },
    );

    startMessagesSocket();

    return () => {
      unsubscribeMessageNew();
      unsubscribeConversationRead();
      unsubscribeConnectionState();
      stopMessagesSocket();
    };
  }, [queryClient, status]);

  return null;
}
