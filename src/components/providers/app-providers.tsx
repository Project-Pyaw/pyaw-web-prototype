"use client";

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getPublicConfig } from "@/config/env";
import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { bootstrapSession } from "@/features/auth/session/session";
import { MessagesRealtimeSync } from "@/features/messages/realtime/messages-realtime-sync";
import { createQueryClient } from "@/lib/query/query-client";

type AppProvidersProps = Readonly<{
  children: ReactNode;
}>;

function SessionQueryCacheBoundary({ children }: AppProvidersProps) {
  const { status } = useSessionStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === "unauthenticated") {
      void queryClient.cancelQueries().finally(() => queryClient.clear());
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
