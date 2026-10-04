"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  emitTypingUpdate,
  getMessagesSocketConnectionState,
  joinTypingConversation,
  leaveTypingConversation,
  subscribeToMessagesSocketConnectionState,
  subscribeToTypingUpdate,
} from "@/lib/socket/messages-socket";

import { mapTypingUpdateEvent } from "../realtime/typing-update";

const LOCAL_TYPING_IDLE_MS = 2_000;
const MAX_REMOTE_TYPING_EXPIRY_MS = 10_000;

type UseConversationTypingOptions = Readonly<{
  conversationId: string;
  conversationType: "DIRECT" | "SELF" | "GROUP";
  currentAccountId: string;
}>;

export function useConversationTyping({
  conversationId,
  conversationType,
  currentAccountId,
}: UseConversationTypingOptions) {
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const localTypingRef = useRef(false);
  const localStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearLocalTyping = useCallback(() => {
    if (localStopTimerRef.current) {
      clearTimeout(localStopTimerRef.current);
      localStopTimerRef.current = null;
    }

    if (
      !localTypingRef.current ||
      (conversationType !== "DIRECT" && conversationType !== "GROUP")
    ) {
      return;
    }

    localTypingRef.current = false;
    emitTypingUpdate(conversationId, false);
  }, [conversationId, conversationType]);

  const onDraftChange = useCallback(
    (content: string) => {
      if (
        !conversationId ||
        (conversationType !== "DIRECT" && conversationType !== "GROUP")
      ) {
        return;
      }

      if (!content.trim()) {
        clearLocalTyping();
        return;
      }

      if (!localTypingRef.current) {
        localTypingRef.current = true;
        emitTypingUpdate(conversationId, true);
      }

      if (localStopTimerRef.current) {
        clearTimeout(localStopTimerRef.current);
      }

      localStopTimerRef.current = setTimeout(
        clearLocalTyping,
        LOCAL_TYPING_IDLE_MS,
      );
    },
    [clearLocalTyping, conversationId, conversationType],
  );

  useEffect(() => {
    if (
      !conversationId ||
      (conversationType !== "DIRECT" && conversationType !== "GROUP")
    ) {
      setIsCounterpartTyping(false);
      return;
    }

    function joinIfConnected() {
      if (getMessagesSocketConnectionState() === "connected") {
        joinTypingConversation(conversationId);
      }
    }

    function clearRemoteTyping() {
      if (remoteExpiryTimerRef.current) {
        clearTimeout(remoteExpiryTimerRef.current);
        remoteExpiryTimerRef.current = null;
      }

      setIsCounterpartTyping(false);
    }

    const unsubscribeConnection = subscribeToMessagesSocketConnectionState(
      () => {
        if (getMessagesSocketConnectionState() === "connected") {
          joinIfConnected();
          return;
        }

        clearLocalTyping();
        clearRemoteTyping();
      },
    );
    const unsubscribeTyping = subscribeToTypingUpdate((payload) => {
      const update = mapTypingUpdateEvent(payload);

      if (
        !update ||
        update.conversationId !== conversationId ||
        update.accountId === currentAccountId
      ) {
        return;
      }

      if (!update.isTyping) {
        clearRemoteTyping();
        return;
      }

      setIsCounterpartTyping(true);

      if (remoteExpiryTimerRef.current) {
        clearTimeout(remoteExpiryTimerRef.current);
      }

      remoteExpiryTimerRef.current = setTimeout(
        clearRemoteTyping,
        Math.min(Math.max(update.expiresInMs, 0), MAX_REMOTE_TYPING_EXPIRY_MS),
      );
    });

    joinIfConnected();

    return () => {
      clearLocalTyping();
      clearRemoteTyping();
      unsubscribeConnection();
      unsubscribeTyping();
      leaveTypingConversation(conversationId);
    };
  }, [clearLocalTyping, conversationId, conversationType, currentAccountId]);

  return { clearTyping: clearLocalTyping, isCounterpartTyping, onDraftChange };
}
