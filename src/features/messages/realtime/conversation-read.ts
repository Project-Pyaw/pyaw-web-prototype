function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export type ConversationReadEvent = Readonly<{
  accountId: string;
  conversationId: string;
  lastReadMessageId: string;
  readAt: string;
}>;

export function mapConversationReadEvent(
  payload: unknown,
): ConversationReadEvent | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data)
  ) {
    return null;
  }

  const data = payload.data;

  if (
    typeof data.accountId !== "string" ||
    typeof data.conversationId !== "string" ||
    typeof data.lastReadMessageId !== "string" ||
    typeof data.readAt !== "string" ||
    Number.isNaN(Date.parse(data.readAt))
  ) {
    return null;
  }

  return {
    accountId: data.accountId,
    conversationId: data.conversationId,
    lastReadMessageId: data.lastReadMessageId,
    readAt: data.readAt,
  };
}
