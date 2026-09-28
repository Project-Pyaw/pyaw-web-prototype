import { authenticatedApi } from "@/features/auth/session/session";

import type { MessageHistoryItem } from "../types";

export function updateMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<MessageHistoryItem> {
  return authenticatedApi.patch<
    MessageHistoryItem,
    Readonly<{ content: string }>
  >(`/conversations/${conversationId}/messages/${messageId}`, { content });
}

export function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<MessageHistoryItem> {
  return authenticatedApi.delete<MessageHistoryItem>(
    `/conversations/${conversationId}/messages/${messageId}`,
  );
}
