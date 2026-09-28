function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function mapMessageDeletedEvent(
  payload: unknown,
): Readonly<{ conversationId: string; deletedAt: string; id: string }> | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.id !== "string" ||
    typeof payload.data.conversationId !== "string" ||
    typeof payload.data.deletedAt !== "string" ||
    Number.isNaN(Date.parse(payload.data.deletedAt))
  ) {
    return null;
  }

  return {
    id: payload.data.id,
    conversationId: payload.data.conversationId,
    deletedAt: payload.data.deletedAt,
  };
}
