function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function mapMessageDeletedEvent(
  payload: unknown,
): Readonly<{ conversationId: string; id: string }> | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.id !== "string" ||
    typeof payload.data.conversationId !== "string"
  ) {
    return null;
  }

  return {
    id: payload.data.id,
    conversationId: payload.data.conversationId,
  };
}
