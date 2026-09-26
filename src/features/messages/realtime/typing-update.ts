function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export type TypingUpdateEvent = Readonly<{
  accountId: string;
  conversationId: string;
  expiresInMs: number;
  isTyping: boolean;
}>;

export function mapTypingUpdateEvent(
  payload: unknown,
): TypingUpdateEvent | null {
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
    typeof data.expiresInMs !== "number" ||
    !Number.isFinite(data.expiresInMs) ||
    typeof data.isTyping !== "boolean"
  ) {
    return null;
  }

  return {
    accountId: data.accountId,
    conversationId: data.conversationId,
    expiresInMs: data.expiresInMs,
    isTyping: data.isTyping,
  };
}
