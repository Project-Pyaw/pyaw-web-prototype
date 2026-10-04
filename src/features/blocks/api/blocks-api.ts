import { authenticatedApi } from "@/features/auth/session/session";

import type { AccountBlock, AccountBlockPage } from "../types";

export function getBlockedAccounts(cursor?: string): Promise<AccountBlockPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";

  return authenticatedApi.get<AccountBlockPage>(`/blocks${query}`);
}

export function blockAccount(accountId: string): Promise<AccountBlock> {
  return authenticatedApi.post<AccountBlock, { accountId: string }>("/blocks", {
    accountId,
  });
}

export function unblockAccount(accountId: string): Promise<void> {
  return authenticatedApi.delete<void>(
    `/blocks/${encodeURIComponent(accountId)}`,
  );
}
