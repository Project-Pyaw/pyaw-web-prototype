import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  getConversations,
  createGroupConversation,
  openDirectConversation,
  openSelfConversation,
} from "../api/conversations-api";
import type { ConversationPage } from "../types";

export const conversationsQueryKey = ["conversations"] as const;

export function useConversations(enabled: boolean) {
  return useInfiniteQuery<
    ConversationPage,
    Error,
    InfiniteData<ConversationPage>,
    typeof conversationsQueryKey,
    string | undefined
  >({
    enabled,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getConversations(pageParam),
    queryKey: conversationsQueryKey,
  });
}

export function useOpenDirectConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: openDirectConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });
}

export function useOpenSelfConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: openSelfConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });
}

export function useCreateGroupConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroupConversation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: conversationsQueryKey,
        refetchType: "active",
      });
    },
  });
}
