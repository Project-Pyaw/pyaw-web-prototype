function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export type PresenceInvalidateEvent = Readonly<{
  accountId: string;
}>;

export function mapPresenceInvalidateEvent(
  payload: unknown,
): PresenceInvalidateEvent | null {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.accountId !== "string"
  ) {
    return null;
  }

  return { accountId: payload.data.accountId };
}
