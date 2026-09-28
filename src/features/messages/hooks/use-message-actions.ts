"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";

import { ApiError } from "@/lib/api/api-error";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";

import { deleteMessage, updateMessage } from "../api/message-actions";
import { mergePersistedMessage, redactReplyPreviews } from "../message-cache";
import type { MessageHistoryPage } from "../types";
import { messageHistoryQueryKey } from "./use-message-history";

type MessageActionResult =
  | Readonly<{ ok: true }>
  | Readonly<{ code?: string; message: string; ok: false }>;

type EditVariables = Readonly<{ content: string; messageId: string }>;

export function useMessageActions(conversationId: string) {
  const queryClient = useQueryClient();
  const inFlightMessageIds = useRef(new Set<string>());
  const editMutation = useMutation({
    mutationFn: ({ content, messageId }: EditVariables) =>
      updateMessage(conversationId, messageId, content),
    onSuccess: (message) => {
      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        messageHistoryQueryKey(conversationId),
        (data) => mergePersistedMessage(data, message),
      );
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => deleteMessage(conversationId, messageId),
    onSuccess: (message) => {
      const queryKey = messageHistoryQueryKey(conversationId);

      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        queryKey,
        (data) =>
          redactReplyPreviews(mergePersistedMessage(data, message), message.id),
      );
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });

  async function runAction<T>(
    messageId: string,
    action: () => Promise<T>,
  ): Promise<MessageActionResult> {
    if (inFlightMessageIds.current.has(messageId)) {
      return { ok: false, message: "This message is already being updated." };
    }

    inFlightMessageIds.current.add(messageId);

    try {
      await action();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { code: error.code, message: error.message, ok: false };
      }

      return {
        ok: false,
        message: "Unable to update this message. Try again.",
      };
    } finally {
      inFlightMessageIds.current.delete(messageId);
    }
  }

  function edit(
    messageId: string,
    content: string,
  ): Promise<MessageActionResult> {
    return runAction(messageId, () =>
      editMutation.mutateAsync({ content, messageId }),
    );
  }

  function remove(messageId: string): Promise<MessageActionResult> {
    return runAction(messageId, () => deleteMutation.mutateAsync(messageId));
  }

  function isPending(messageId: string): boolean {
    return (
      (editMutation.isPending &&
        editMutation.variables.messageId === messageId) ||
      (deleteMutation.isPending && deleteMutation.variables === messageId)
    );
  }

  return { edit, isPending, remove };
}
