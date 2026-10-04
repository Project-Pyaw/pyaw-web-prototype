"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { bootstrapSession } from "@/features/auth/session/session";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatShell } from "@/features/conversations/components/chat-shell";
import { UsernameSetupScreen } from "@/features/profile/components/username-setup-screen";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

type ChatPlaceholderProps = Readonly<{
  selectedConversationId?: string;
}>;

function ChatBootstrapSkeleton() {
  return (
    <main className="h-screen h-[100dvh] overflow-hidden bg-background">
      <section
        aria-busy="true"
        className="mx-auto grid h-full max-w-none overflow-hidden bg-surface md:grid-cols-[clamp(18rem,28vw,22rem)_minmax(0,1fr)]"
      >
        <span className="sr-only" role="status">
          Loading your account…
        </span>
        <div className="hidden min-h-0 flex-col border-r border-border md:flex">
          <div className="flex min-h-16 items-center gap-2 border-b border-border px-3">
            <Skeleton className="h-10 w-16 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="ml-auto size-8 rounded-full" />
          </div>
          <div className="space-y-5 px-3 py-4">
            <Skeleton className="h-5 w-16 rounded" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5 rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-16 border-b border-border" />
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-4 md:px-6">
            <div className="flex justify-end">
              <Skeleton className="h-12 w-44 rounded-2xl" />
            </div>
            <Skeleton className="h-14 w-52 rounded-2xl" />
          </div>
          <div className="border-t border-border p-3">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </section>
    </main>
  );
}

export function ChatPlaceholder({
  selectedConversationId,
}: ChatPlaceholderProps) {
  const router = useRouter();
  const { bootstrapError, status } = useSessionStatus();
  const profileQuery = useCurrentProfile(status === "authenticated");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "initializing") {
    return (
      <>
        <ChatBootstrapSkeleton />
        {bootstrapError ? (
          <div className="fixed inset-x-0 bottom-6 z-10 flex justify-center px-6">
            <button
              className="min-h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => void bootstrapSession()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
      </>
    );
  }

  if (status === "unauthenticated") {
    return <main className="min-h-[100dvh]" />;
  }

  if (profileQuery.isPending) {
    return <ChatBootstrapSkeleton />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
        <section className="max-w-md space-y-3 rounded-xl border border-border bg-surface p-8">
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

  const needsDisplayName = !profile.displayName?.trim();
  const needsUsername = account.username === null;

  if (needsDisplayName || needsUsername) {
    return (
      <UsernameSetupScreen
        currentDisplayName={profile.displayName}
        currentUsername={account.username}
        needsDisplayName={needsDisplayName}
        needsUsername={needsUsername}
      />
    );
  }

  return (
    <ChatShell
      currentAccount={account}
      currentProfile={profile}
      selectedConversationId={selectedConversationId}
    />
  );
}
