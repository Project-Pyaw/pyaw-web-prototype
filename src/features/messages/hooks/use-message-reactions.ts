"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  addMessageReaction,
  removeMessageReaction,
} from "../api/message-reactions";
import { mergePersistedMessage } from "../message-cache";
import type { MessageHistoryPage, MessageReaction } from "../types";
import { messageHistoryQueryKey } from "./use-message-history";

type MessageReactionVariables = Readonly<{
  messageId: string;
  reaction: MessageReaction;
  reactedByMe: boolean;
}>;

function reactionKey(messageId: string, reaction: MessageReaction): string {
  return `${messageId}:${reaction}`;
}

export function useMessageReactions(conversationId: string) {
  const queryClient = useQueryClient();
  const inFlightReactions = useRef(new Set<string>());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: ({
      messageId,
      reaction,
      reactedByMe,
    }: MessageReactionVariables) =>
      reactedByMe
        ? removeMessageReaction(conversationId, messageId, reaction)
        : addMessageReaction(conversationId, messageId, reaction),
    onSuccess: (message) => {
      queryClient.setQueryData<InfiniteData<MessageHistoryPage>>(
        messageHistoryQueryKey(conversationId),
        (data) => mergePersistedMessage(data, message),
      );
    },
  });

  function toggleReaction(variables: MessageReactionVariables): void {
    const key = reactionKey(variables.messageId, variables.reaction);

    if (inFlightReactions.current.has(key)) {
      return;
    }

    inFlightReactions.current.add(key);
    setErrors((current) => {
      if (!current[variables.messageId]) {
        return current;
      }

      const { [variables.messageId]: _removed, ...remaining } = current;
      return remaining;
    });
    mutation.mutate(variables, {
      onError: () => {
        setErrors((current) => ({
          ...current,
          [variables.messageId]: "Couldn’t update reaction. Try again.",
        }));
      },
      onSettled: () => {
        inFlightReactions.current.delete(key);
      },
    });
  }

  function isPending(messageId: string, reaction: MessageReaction): boolean {
    return inFlightReactions.current.has(reactionKey(messageId, reaction));
  }

  return {
    getError: (messageId: string) => errors[messageId],
    isPending,
    toggleReaction,
  };
}
