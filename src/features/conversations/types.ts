export type ConversationType = "DIRECT" | "SELF" | "GROUP";

export type ConversationReadState = Readonly<{
  lastReadAt: string | null;
  unreadCount: number;
}>;

export type ConversationCounterpart = Readonly<{
  accountId: string;
  username: string | null;
  profile: Readonly<{
    id: string;
    displayName: string | null;
    avatar: string | null;
    bio: string | null;
  }> | null;
}>;

export type ConversationListItem = Readonly<{
  id: string;
  type: ConversationType;
  title: string | null;
  avatar: string | null;
  membership: Readonly<{ role: "OWNER" | "ADMIN" | "MEMBER" }> | null;
  memberCount: number | null;
  memberSummary: ReadonlyArray<
    Readonly<{
      accountId: string;
      username: string | null;
      displayName: string | null;
    }>
  >;
  activityAt: string;
  createdAt: string;
  counterpart: ConversationCounterpart | null;
  self: Readonly<{ label: string }> | null;
  latestMessage: Readonly<{
    content: string | null;
    hasAttachments: boolean;
  }> | null;
  readState: ConversationReadState;
}>;

export type ConversationPage = Readonly<{
  items: ConversationListItem[];
  pagination: Readonly<{
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  }>;
}>;

export type OpenedConversation = Readonly<{
  id: string;
  type: "DIRECT" | "SELF";
  createdAt: string;
  updatedAt: string;
  participants: ReadonlyArray<
    ConversationCounterpart & { joinedAt: string | null }
  >;
  readState: ConversationReadState;
}>;

export type CreatedGroupConversation = Readonly<{
  id: string;
  type: "GROUP";
  title: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  membership: Readonly<{ role: "OWNER" | "ADMIN" | "MEMBER" }>;
  memberCount: number;
}>;
