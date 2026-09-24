export type ConnectionIdentity = Readonly<{
  id: string;
  username: string | null;
  profile: Readonly<{
    displayName: string | null;
    avatar: string | null;
  }> | null;
}>;

export type Connection = Readonly<{
  id: string;
  counterpart: ConnectionIdentity;
  createdAt: string;
}>;

export type ConnectionRequestDirection = "INCOMING" | "OUTGOING";

export type ConnectionRequestStatus =
  "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type ConnectionRequest = Readonly<{
  id: string;
  direction: ConnectionRequestDirection;
  status: ConnectionRequestStatus;
  counterpart: ConnectionIdentity;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type ConnectionPage<T> = Readonly<{
  items: T[];
  pagination: Readonly<{
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  }>;
}>;

export type AccountLookupResult = Readonly<{
  registered: boolean;
  account: ConnectionIdentity | null;
}>;
