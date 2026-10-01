import { usePresenceSnapshots } from "./use-presence-snapshots";

export function useCounterpartPresence(
  accountId: string | undefined,
  bootstrap = false,
) {
  const presence = usePresenceSnapshots(
    accountId ? [accountId] : [],
    bootstrap,
  );

  return accountId ? (presence[accountId] ?? null) : null;
}
