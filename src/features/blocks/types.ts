export type BlockedAccount = Readonly<{
  id: string;
  username: string | null;
  profile: Readonly<{
    displayName: string | null;
  }> | null;
}>;

export type AccountBlock = Readonly<{
  account: BlockedAccount;
  createdAt: string;
  id: string;
}>;

export type AccountBlockPage = Readonly<{
  items: AccountBlock[];
  pagination: Readonly<{
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
  }>;
}>;
