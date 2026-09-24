import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { getMessageHistory } from "../api/get-message-history";
import type { MessageHistoryPage } from "../types";

export const messagesQueryKey = ["messages"] as const;

export function messageHistoryQueryKey(conversationId: string) {
  return [...messagesQueryKey, conversationId] as const;
}

export function useMessageHistory(conversationId: string, enabled: boolean) {
  const queryKey = messageHistoryQueryKey(conversationId);

  return useInfiniteQuery<
    MessageHistoryPage,
    Error,
    InfiniteData<MessageHistoryPage>,
    typeof queryKey,
    string | undefined
  >({
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getMessageHistory(conversationId, pageParam),
    queryKey,
  });
}
