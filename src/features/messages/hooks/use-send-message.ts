"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";

import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";

import { sendMessage } from "../api/send-message";
import {
  mergePersistedMessage,
  updateOptimisticMessage,
} from "../message-cache";
import type { MessageHistoryPage, OptimisticMessage } from "../types";
import { messageHistoryQueryKey } from "./use-message-history";

const MAX_TEXT_MESSAGE_LENGTH = 4000;

type SendMessageVariables = Readonly<{
  clientMessageId: string;
  content: string;
  conversationId: string;
}>;

function createClientMessageId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return [...bytes]
    .map((byte, index) => {
      const separator = [4, 6, 8, 10].includes(index) ? "-" : "";

      return `${separator}${byte.toString(16).padStart(2, "0")}`;
    })
    .join("");
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const inFlightClientMessageIds = useRef(new Set<string>());
  const queryKey = messageHistoryQueryKey(conversationId);
  const mutation = useMutation({
    mutationFn: ({
      clientMessageId,
      content,
      conversationId: targetId,
    }: SendMessageVariables) =>
      sendMessage(targetId, { clientMessageId, content }),
    onError: (_error, variables) => {
      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        messageHistoryQueryKey(variables.conversationId),
        (data) =>
          updateOptimisticMessage(
            data,
            variables.clientMessageId,
            (message) => ({
              ...message,
              deliveryState: "failed",
            }),
          ),
      );
    },
    onSuccess: (message, variables) => {
      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        messageHistoryQueryKey(variables.conversationId),
        (data) => mergePersistedMessage(data, message),
      );
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });

  function submit(variables: SendMessageVariables): boolean {
    if (inFlightClientMessageIds.current.has(variables.clientMessageId)) {
      return false;
    }

    inFlightClientMessageIds.current.add(variables.clientMessageId);
    mutation.mutate(variables, {
      onSettled: () => {
        inFlightClientMessageIds.current.delete(variables.clientMessageId);
      },
    });

    return true;
  }

  function send(content: string): boolean {
    const normalizedContent = content.trim();

    if (
      !normalizedContent ||
      normalizedContent.length > MAX_TEXT_MESSAGE_LENGTH ||
      !queryClient.getQueryData<InfiniteData<MessageHistoryPage>>(queryKey)
    ) {
      return false;
    }

    const clientMessageId = createClientMessageId();
    const optimisticMessage: OptimisticMessage = {
      clientMessageId,
      content: normalizedContent,
      conversationId,
      createdAt: new Date().toISOString(),
      deliveryState: "sending",
      type: "TEXT",
    };

    queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
      queryKey,
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page, index) =>
                index === 0
                  ? { ...page, items: [optimisticMessage, ...page.items] }
                  : page,
              ),
            }
          : data,
    );

    return submit({
      clientMessageId,
      content: normalizedContent,
      conversationId,
    });
  }

  function retry(message: OptimisticMessage): boolean {
    if (
      message.deliveryState !== "failed" ||
      message.conversationId !== conversationId ||
      inFlightClientMessageIds.current.has(message.clientMessageId)
    ) {
      return false;
    }

    queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
      queryKey,
      (data) =>
        updateOptimisticMessage(
          data,
          message.clientMessageId,
          (currentMessage) => ({
            ...currentMessage,
            deliveryState: "sending",
          }),
        ),
    );

    return submit({
      clientMessageId: message.clientMessageId,
      content: message.content,
      conversationId,
    });
  }

  return { retry, send };
}
