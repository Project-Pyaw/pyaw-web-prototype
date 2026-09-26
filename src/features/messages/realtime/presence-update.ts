function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export type PresenceUpdateEvent = Readonly<{
  accountId: string;
  lastSeenAt: string | null;
  status: "OFFLINE" | "ONLINE";
}>;

export function mapPresenceUpdateEvent(
  payload: unknown,
): PresenceUpdateEvent | null {
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
    (data.status !== "ONLINE" && data.status !== "OFFLINE") ||
    (data.lastSeenAt !== null &&
      (typeof data.lastSeenAt !== "string" ||
        Number.isNaN(Date.parse(data.lastSeenAt))))
  ) {
    return null;
  }

  return {
    accountId: data.accountId,
    lastSeenAt: data.lastSeenAt,
    status: data.status,
  };
}
