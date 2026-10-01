import { authenticatedApi } from "@/features/auth/session/session";

export type PresenceSnapshot = Readonly<{
  accountId: string;
  lastSeenAt: string | null;
  status: "OFFLINE" | "ONLINE" | "UNKNOWN";
}>;

type PresenceSnapshotResponse = Readonly<{
  items: PresenceSnapshot[];
}>;

export async function getPresence(
  accountIds: readonly string[],
): Promise<PresenceSnapshot[]> {
  const query = new URLSearchParams();

  accountIds.forEach((accountId) => query.append("accountIds", accountId));

  const response = await authenticatedApi.get<PresenceSnapshotResponse>(
    `/presence?${query}`,
  );

  return response.items;
}
