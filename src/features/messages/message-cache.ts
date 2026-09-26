import type { InfiniteData } from "@tanstack/react-query";

import type {
  MessageHistoryItem,
  MessageHistoryPage,
  MessageItem,
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
