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
  readReceipt?: Readonly<{
    accountId: string;
    readAt: string;
  }>;
}>;

export type MessageDeliveryState = "sending" | "failed";

export type OptimisticMessage = Readonly<{
  clientMessageId: string;
  content: string;
  conversationId: string;
  createdAt: string;
  deliveryState: MessageDeliveryState;
  type: "TEXT";
}>;

export type MessageItem = MessageHistoryItem | OptimisticMessage;

export type MessageHistoryPage = Readonly<{
  items: MessageItem[];
  nextCursor: string | null;
}>;
