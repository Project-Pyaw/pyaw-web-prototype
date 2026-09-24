import { authenticatedApi } from "@/features/auth/session/session";

import type { ConversationPage, OpenedConversation } from "../types";

export function getConversations(cursor?: string): Promise<ConversationPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";

  return authenticatedApi.get<ConversationPage>(`/conversations${query}`);
}

export function openDirectConversation(
  accountId: string,
): Promise<OpenedConversation> {
  return authenticatedApi.post<OpenedConversation, { accountId: string }>(
    "/conversations/direct",
    { accountId },
  );
}

export function openSelfConversation(): Promise<OpenedConversation> {
  return authenticatedApi.post<OpenedConversation, undefined>(
    "/conversations/self",
    undefined,
  );
}
