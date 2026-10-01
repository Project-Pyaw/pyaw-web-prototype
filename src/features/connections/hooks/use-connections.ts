import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConnectionRequests,
  getConnections,
  lookupAccountByPhone,
  respondToConnectionRequest,
  sendConnectionRequest,
} from "../api/connections-api";
import type {
  ConnectionPage,
  ConnectionRequest,
  ConnectionRequestDirection,
} from "../types";

export const connectionsQueryKey = ["connections"] as const;

export const connectionRequestQueryKey = (
  direction: ConnectionRequestDirection,
  status?: "PENDING",
) =>
  status
    ? ([...connectionsQueryKey, "requests", direction, status] as const)
    : ([...connectionsQueryKey, "requests", direction] as const);

function invalidateRequestState(
  queryClient: ReturnType<typeof useQueryClient>,
  direction: ConnectionRequestDirection,
) {
  queryClient.invalidateQueries({
    queryKey: connectionRequestQueryKey(direction),
  });
}

function removeRequestFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  direction: ConnectionRequestDirection,
  requestId: string,
) {
  queryClient.setQueriesData<ConnectionPage<ConnectionRequest>>(
    { queryKey: connectionRequestQueryKey(direction) },
    (current) =>
      current
        ? {
            ...current,
            items: current.items.filter((request) => request.id !== requestId),
          }
        : current,
  );
}

export function useConnections(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getConnections,
    queryKey: connectionsQueryKey,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useConnectionRequests(
  direction: ConnectionRequestDirection,
  enabled: boolean,
  status?: "PENDING",
) {
  return useQuery({
    enabled,
    queryFn: () => getConnectionRequests({ direction, status }),
    queryKey: connectionRequestQueryKey(direction, status),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useAccountLookup() {
  return useMutation({ mutationFn: lookupAccountByPhone });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendConnectionRequest,
    onSuccess: (request) => {
      queryClient.setQueryData<ConnectionPage<ConnectionRequest>>(
        connectionRequestQueryKey("OUTGOING", "PENDING"),
        (current) =>
          current
            ? {
                ...current,
                items: [request, ...current.items],
              }
            : current,
      );
      invalidateRequestState(queryClient, "OUTGOING");
    },
  });
}

export function useRespondToConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      status,
    }: {
      requestId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => respondToConnectionRequest(requestId, status),
    onSuccess: (request, variables) => {
      removeRequestFromCache(queryClient, request.direction, request.id);
      invalidateRequestState(queryClient, request.direction);

      if (variables.status === "ACCEPTED") {
        queryClient.invalidateQueries({
          exact: true,
          queryKey: connectionsQueryKey,
        });
      }
    },
  });
}
