import { authenticatedApi } from "@/features/auth/session/session";

import type { MessageHistoryItem, MessageReaction } from "../types";

function reactionPath(
  conversationId: string,
  messageId: string,
  reaction: MessageReaction,
): string {
  return `/conversations/${conversationId}/messages/${messageId}/reactions/${reaction}`;
}

export function addMessageReaction(
  conversationId: string,
  messageId: string,
  reaction: MessageReaction,
): Promise<MessageHistoryItem> {
  return authenticatedApi.put<MessageHistoryItem, undefined>(
    reactionPath(conversationId, messageId, reaction),
    undefined,
  );
}

export function removeMessageReaction(
  conversationId: string,
  messageId: string,
  reaction: MessageReaction,
): Promise<MessageHistoryItem> {
  return authenticatedApi.delete<MessageHistoryItem>(
    reactionPath(conversationId, messageId, reaction),
  );
}
