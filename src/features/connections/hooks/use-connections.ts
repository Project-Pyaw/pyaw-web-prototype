import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConnectionRequests,
  getConnections,
  lookupAccountByPhone,
  respondToConnectionRequest,
  sendConnectionRequest,
} from "../api/connections-api";
import type { ConnectionRequestDirection } from "../types";

export const connectionsQueryKey = ["connections"] as const;

const connectionRequestQueryKey = (direction: ConnectionRequestDirection) =>
  [...connectionsQueryKey, "requests", direction] as const;

function invalidateRequestState(
  queryClient: ReturnType<typeof useQueryClient>,
  direction: ConnectionRequestDirection,
) {
  queryClient.invalidateQueries({
    queryKey: connectionRequestQueryKey(direction),
  });
}

export function useConnections(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getConnections,
    queryKey: connectionsQueryKey,
  });
}

export function useConnectionRequests(
  direction: ConnectionRequestDirection,
  enabled: boolean,
) {
  return useQuery({
    enabled,
    queryFn: () => getConnectionRequests({ direction }),
    queryKey: connectionRequestQueryKey(direction),
  });
}

export function useAccountLookup() {
  return useMutation({ mutationFn: lookupAccountByPhone });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendConnectionRequest,
    onSuccess: () => {
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
    onSuccess: (_, variables) => {
      invalidateRequestState(queryClient, "INCOMING");

      if (variables.status === "ACCEPTED") {
        queryClient.invalidateQueries({ queryKey: connectionsQueryKey });
      }
    },
  });
}
