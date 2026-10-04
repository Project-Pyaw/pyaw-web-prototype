const reasons = new Set([
  "MEMBER_ADDED",
  "MEMBER_REMOVED",
  "MEMBER_LEFT",
  "ROLE_CHANGED",
  "TITLE_CHANGED",
  "AVATAR_CHANGED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export type ConversationChangedEvent = Readonly<{
  conversationId: string;
  reason:
    | "MEMBER_ADDED"
    | "MEMBER_REMOVED"
    | "MEMBER_LEFT"
    | "ROLE_CHANGED"
    | "TITLE_CHANGED"
    | "AVATAR_CHANGED";
}>;

export function mapConversationChangedEvent(
  payload: unknown,
): ConversationChangedEvent | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.conversationId !== "string" ||
    typeof payload.data.reason !== "string" ||
    !reasons.has(payload.data.reason)
  ) {
    return null;
  }

  return {
    conversationId: payload.data.conversationId,
    reason: payload.data.reason as ConversationChangedEvent["reason"],
  };
}
