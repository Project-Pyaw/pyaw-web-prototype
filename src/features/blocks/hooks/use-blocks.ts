import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  connectionRequestQueryKey,
  connectionsQueryKey,
} from "@/features/connections/hooks/use-connections";
import type {
  Connection,
  ConnectionPage,
  ConnectionRequest,
} from "@/features/connections/types";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";
import type { ConversationPage } from "@/features/conversations/types";
import { invalidatePresence } from "@/features/messages/hooks/use-presence-snapshots";

import {
  blockAccount,
  getBlockedAccounts,
  unblockAccount,
} from "../api/blocks-api";
import type { AccountBlockPage } from "../types";

export const blockedAccountsQueryKey = ["blocks"] as const;

function removeBlockedDirectConversations(
  data: InfiniteData<ConversationPage> | undefined,
  accountId: string,
): InfiniteData<ConversationPage> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter(
        (conversation) => conversation.counterpart?.accountId !== accountId,
      ),
    })),
  };
}

function removeRelationshipFromCache<T extends Connection | ConnectionRequest>(
  current: ConnectionPage<T> | undefined,
  accountId: string,
): ConnectionPage<T> | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    items: current.items.filter(
      (relationship) => relationship.counterpart.id !== accountId,
    ),
  };
}

function removeBlockedRelationshipState(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
): void {
  queryClient.setQueriesData<ConnectionPage<Connection>>(
    { queryKey: connectionsQueryKey },
    (current) => removeRelationshipFromCache(current, accountId),
  );
  queryClient.setQueriesData<ConnectionPage<ConnectionRequest>>(
    { queryKey: connectionRequestQueryKey("INCOMING") },
    (current) => removeRelationshipFromCache(current, accountId),
  );
  queryClient.setQueriesData<ConnectionPage<ConnectionRequest>>(
    { queryKey: connectionRequestQueryKey("OUTGOING") },
    (current) => removeRelationshipFromCache(current, accountId),
  );
  queryClient.setQueryData<InfiniteData<ConversationPage>>(
    conversationsQueryKey,
    (current) => removeBlockedDirectConversations(current, accountId),
  );
}

export function useBlockedAccounts(enabled: boolean) {
  return useInfiniteQuery<
    AccountBlockPage,
    Error,
    InfiniteData<AccountBlockPage>,
    typeof blockedAccountsQueryKey,
    string | undefined
  >({
    enabled,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getBlockedAccounts(pageParam),
    queryKey: blockedAccountsQueryKey,
  });
}

export function useBlockAccount(currentAccountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: blockAccount,
    onSuccess: async (_block, accountId) => {
      invalidatePresence(queryClient, currentAccountId, accountId);
      removeBlockedRelationshipState(queryClient, accountId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: blockedAccountsQueryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
        queryClient.invalidateQueries({
          queryKey: connectionRequestQueryKey("INCOMING"),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionRequestQueryKey("OUTGOING"),
        }),
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey }),
      ]);
    },
  });
}

export function useUnblockAccount(currentAccountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unblockAccount,
    onSuccess: async (_result, accountId) => {
      invalidatePresence(queryClient, currentAccountId, accountId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: blockedAccountsQueryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
        queryClient.invalidateQueries({
          queryKey: connectionRequestQueryKey("INCOMING"),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionRequestQueryKey("OUTGOING"),
        }),
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey }),
      ]);
    },
  });
}
