export type MessageHistoryItem = Readonly<{
  id: string;
  clientMessageId: string | null;
  conversationId: string;
  type: string;
  content: string | null;
  createdAt: string;
  sender: Readonly<{
    accountId: string;
    username: string | null;
    profile: Readonly<{
      id: string;
      displayName: string | null;
    }> | null;
  }>;
}>;

export type MessageHistoryPage = Readonly<{
  items: MessageHistoryItem[];
  nextCursor: string | null;
}>;
