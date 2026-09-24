"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { ChatShell } from "@/features/conversations/components/chat-shell";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

type ChatPlaceholderProps = Readonly<{
  selectedConversationId?: string;
}>;

export function ChatPlaceholder({
  selectedConversationId,
}: ChatPlaceholderProps) {
  const router = useRouter();
  const { status } = useSessionStatus();
  const profileQuery = useCurrentProfile(status === "authenticated");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "unauthenticated") {
    return <main className="min-h-screen" />;
  }

  if (profileQuery.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <p className="text-sm text-foreground-muted" role="status">
          Loading your account…
        </p>
      </main>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <section className="max-w-md space-y-3 rounded-xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            Your account is unavailable.
          </h1>
          <p className="text-sm leading-6 text-foreground-muted">
            Please try again shortly.
          </p>
        </section>
      </main>
    );
  }

  const { account, profile } = profileQuery.data;
  return (
    <ChatShell
      currentAccount={account}
      currentProfile={profile}
      selectedConversationId={selectedConversationId}
    />
  );
}
