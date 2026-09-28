import type { InfiniteData } from "@tanstack/react-query";

import type {
  MessageHistoryItem,
  MessageHistoryPage,
  MessageItem,
  MessageReaction,
  OptimisticMessage,
} from "./types";

export function isOptimisticMessage(
  message: MessageItem,
): message is OptimisticMessage {
  return "deliveryState" in message;
}

export function updateOptimisticMessage(
  data: InfiniteData<MessageHistoryPage> | undefined,
  clientMessageId: string,
  update: (message: OptimisticMessage) => MessageItem,
): InfiniteData<MessageHistoryPage> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((message) =>
        isOptimisticMessage(message) &&
        message.clientMessageId === clientMessageId
          ? update(message)
          : message,
      ),
    })),
  };
}

export function mergePersistedMessage(
  data: InfiniteData<MessageHistoryPage> | undefined,
  message: MessageHistoryItem,
): InfiniteData<MessageHistoryPage> | undefined {
  if (!data) {
    return data;
  }

  const hasPersistedMatch = data.pages.some((page) =>
    page.items.some(
      (item) =>
        !isOptimisticMessage(item) &&
        (item.id === message.id ||
          (message.clientMessageId !== null &&
            item.clientMessageId === message.clientMessageId)),
    ),
  );
  let replaced = false;

  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.flatMap((item) => {
      const matchesClientMessage =
        message.clientMessageId !== null &&
        item.clientMessageId === message.clientMessageId;
      const matchesMessage =
        !isOptimisticMessage(item) && item.id === message.id;

      if (!matchesClientMessage && !matchesMessage) {
        return [item];
      }

      if (
        !replaced &&
        (matchesMessage || (!hasPersistedMatch && isOptimisticMessage(item)))
      ) {
        if (
          matchesMessage &&
          !isOptimisticMessage(item) &&
          ((item.deletedAt !== null && message.deletedAt === null) ||
            (item.reactionVersion > message.reactionVersion &&
              message.deletedAt === null) ||
            (item.editedAt !== null &&
              message.editedAt !== null &&
              Date.parse(item.editedAt) > Date.parse(message.editedAt)))
        ) {
          replaced = true;
          return [item];
        }

        replaced = true;
        return [message];
      }

      return [];
    }),
  }));

  if (replaced) {
    return {
      ...data,
      pages: pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              items: page.items.toSorted((left, right) =>
                right.createdAt.localeCompare(left.createdAt),
              ),
            }
          : page,
      ),
    };
  }

  const [firstPage, ...remainingPages] = pages;

  if (!firstPage) {
    return data;
  }

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        items: [message, ...firstPage.items].toSorted((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        ),
      },
      ...remainingPages,
    ],
  };
}

export function applyReadReceipt(
  data: InfiniteData<MessageHistoryPage> | undefined,
  receipt: Readonly<{
    accountId: string;
    lastReadMessageId: string;
    readAt: string;
  }>,
): InfiniteData<MessageHistoryPage> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((message) =>
        !isOptimisticMessage(message) &&
        message.id === receipt.lastReadMessageId
          ? {
              ...message,
              readReceipt: {
                accountId: receipt.accountId,
                readAt: receipt.readAt,
              },
            }
          : message,
      ),
    })),
  };
}

export function redactReplyPreviews(
  data: InfiniteData<MessageHistoryPage> | undefined,
  deletedMessageId: string,
): InfiniteData<MessageHistoryPage> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((message) => {
        if (message.replyTo?.messageId !== deletedMessageId) {
          return message;
        }

        return {
          ...message,
          replyTo: {
            ...message.replyTo,
            content: null,
            deleted: true,
            hasAttachments: false,
          },
        };
      }),
    })),
  };
}

export function applyMessageDeleted(
  data: InfiniteData<MessageHistoryPage> | undefined,
  deletedMessage: Readonly<{
    deletedAt: string;
    id: string;
  }>,
): InfiniteData<MessageHistoryPage> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((message) => {
        if (isOptimisticMessage(message) || message.id !== deletedMessage.id) {
          return message;
        }

        return {
          ...message,
          attachments: [],
          content: null,
          deletedAt: deletedMessage.deletedAt,
          reactions: [],
          replyTo: null,
        };
      }),
    })),
  };
}

export function applyMessageReactionUpdate(
  data: InfiniteData<MessageHistoryPage> | undefined,
  update: Readonly<{
    accountId: string;
    active: boolean;
    messageId: string;
    reaction: MessageReaction;
    reactionVersion: number;
    reactions: readonly Readonly<{
      count: number;
      reaction: MessageReaction;
    }>[];
  }>,
  currentAccountId: string,
): InfiniteData<MessageHistoryPage> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((message) => {
        if (
          isOptimisticMessage(message) ||
          message.id !== update.messageId ||
          message.deletedAt !== null ||
          update.reactionVersion <= message.reactionVersion
        ) {
          return message;
        }

        const reactionsByType = new Map(
          message.reactions.map((summary) => [summary.reaction, summary]),
        );

        return {
          ...message,
          reactionVersion: update.reactionVersion,
          reactions: update.reactions.map((summary) => ({
            ...summary,
            reactedByMe:
              update.accountId === currentAccountId &&
              summary.reaction === update.reaction
                ? update.active
                : (reactionsByType.get(summary.reaction)?.reactedByMe ?? false),
          })),
        };
      }),
    })),
  };
}
