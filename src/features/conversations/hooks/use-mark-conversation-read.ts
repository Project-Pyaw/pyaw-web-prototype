"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";

import { markConversationRead } from "../api/conversations-api";
import type { ConversationPage } from "../types";
import { conversationsQueryKey } from "./use-conversations";

type MarkReadVariables = Readonly<{
  conversationId: string;
  messageId: string;
}>;

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  const acknowledgedMessageIds = useRef(new Set<string>());
  const mutation = useMutation({
    mutationFn: ({ conversationId }: MarkReadVariables) =>
      markConversationRead(conversationId),
    onError: (_error, variables) => {
      acknowledgedMessageIds.current.delete(variables.messageId);
    },
    onSuccess: (readState, variables) => {
      queryClient.setQueryData<InfiniteData<ConversationPage>>(
        conversationsQueryKey,
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((conversation) =>
                    conversation.id === variables.conversationId
                      ? { ...conversation, readState }
                      : conversation,
                  ),
                })),
              }
            : data,
      );
    },
  });

  function markRead(conversationId: string, messageId: string): void {
    if (acknowledgedMessageIds.current.has(messageId)) {
      return;
    }

    acknowledgedMessageIds.current.add(messageId);
    mutation.mutate({ conversationId, messageId });
  }

  return { markRead };
}
