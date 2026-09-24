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
