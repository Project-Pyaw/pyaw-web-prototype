"use client";

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getPublicConfig } from "@/config/env";
import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { bootstrapSession } from "@/features/auth/session/session";
import { connectionsQueryKey } from "@/features/connections/hooks/use-connections";
import { conversationsQueryKey } from "@/features/conversations/hooks/use-conversations";
import { messagesQueryKey } from "@/features/messages/hooks/use-message-history";
import { MessagesRealtimeSync } from "@/features/messages/realtime/messages-realtime-sync";
import { currentProfileQueryKey } from "@/features/profile/hooks/use-current-profile";
import { createQueryClient } from "@/lib/query/query-client";

type AppProvidersProps = Readonly<{
  children: ReactNode;
}>;

function SessionQueryCacheBoundary({ children }: AppProvidersProps) {
  const { status } = useSessionStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === "unauthenticated") {
      queryClient.removeQueries({ queryKey: currentProfileQueryKey });
      queryClient.removeQueries({ queryKey: connectionsQueryKey });
      queryClient.removeQueries({ queryKey: conversationsQueryKey });
      queryClient.removeQueries({ queryKey: messagesQueryKey });
    }
  }, [queryClient, status]);

  return children;
}

export function AppProviders({ children }: AppProvidersProps) {
  getPublicConfig();

  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionQueryCacheBoundary>{children}</SessionQueryCacheBoundary>
      <MessagesRealtimeSync />
    </QueryClientProvider>
  );
}
