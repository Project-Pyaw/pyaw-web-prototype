import { authenticatedApi } from "@/features/auth/session/session";

import type { MessageHistoryItem } from "../types";

export type SendMessageInput = Readonly<{
  clientMessageId: string;
  content?: string;
  attachmentIds?: readonly string[];
  replyToMessageId?: string;
}>;

export function sendMessage(
  conversationId: string,
  input: SendMessageInput,
): Promise<MessageHistoryItem> {
  return authenticatedApi.post<MessageHistoryItem, SendMessageInput>(
    `/conversations/${conversationId}/messages`,
    input,
  );
}
