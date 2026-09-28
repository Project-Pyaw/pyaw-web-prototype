export type MessageAttachment = Readonly<{
  id: string;
  kind: "IMAGE" | "FILE";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "READY" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}>;

export type ReplyMessagePreview = Readonly<{
  messageId: string;
  type: string;
  sender: Readonly<{
    accountId: string;
    username: string | null;
    profile: Readonly<{
      id: string;
      displayName: string | null;
    }> | null;
  }>;
  content: string | null;
  hasAttachments: boolean;
  deleted: boolean;
}>;

export type MessageReaction =
  | "THUMBS_UP"
  | "HEART"
  | "FACE_WITH_TEARS_OF_JOY"
  | "OPEN_MOUTH"
  | "CRY"
  | "ANGRY";

export type MessageReactionSummary = Readonly<{
  reaction: MessageReaction;
  count: number;
  reactedByMe: boolean;
}>;

export type MessageHistoryItem = Readonly<{
  id: string;
  clientMessageId: string | null;
  conversationId: string;
  type: string;
  content: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  attachments: readonly MessageAttachment[];
  reactions: readonly MessageReactionSummary[];
  reactionVersion: number;
  replyTo: ReplyMessagePreview | null;
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
  attachments: readonly MessageAttachment[];
  replyTo: ReplyMessagePreview | null;
  localImagePreviewUrl?: string;
}>;

export type MessageItem = MessageHistoryItem | OptimisticMessage;

export type MessageHistoryPage = Readonly<{
  items: MessageItem[];
  nextCursor: string | null;
}>;
