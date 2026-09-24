import { authenticatedApi } from "@/features/auth/session/session";

import type { MessageHistoryPage } from "../types";

export function getMessageHistory(
  conversationId: string,
  cursor?: string,
): Promise<MessageHistoryPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";

  return authenticatedApi.get<MessageHistoryPage>(
    `/conversations/${conversationId}/messages${query}`,
  );
}
