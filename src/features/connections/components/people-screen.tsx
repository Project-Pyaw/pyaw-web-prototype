"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  AppHeader,
  type AppNavigationSection,
} from "@/components/layout/app-header";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { bootstrapSession } from "@/features/auth/session/session";
import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { AccountNavigationButton } from "@/features/profile/components/account-navigation-button";
import { UsernameSetupScreen } from "@/features/profile/components/username-setup-screen";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

import { ConnectionsPanel } from "./connections-panel";

function PeopleHeader({
  avatar,
  displayName,
  onOpenProfile,
  onNavigate,
  username,
}: Readonly<{
  avatar: string | null;
  displayName: string | null;
  onOpenProfile: () => void;
  onNavigate: (section: AppNavigationSection) => void;
  username: string | null;
}>) {
  return (
    <AppHeader
      activeSection="people"
      endContent={
        <AccountNavigationButton
          avatar={avatar}
          displayName={displayName}
          onClick={onOpenProfile}
          username={username}
        />
      }
      onBrandClick={() => onNavigate("chats")}
      onNavigate={onNavigate}
    />
  );
}

export function PeopleScreen() {
  const router = useRouter();
  const { bootstrapError, status } = useSessionStatus();
  const profileQuery = useCurrentProfile(status === "authenticated");

  function navigate(section: AppNavigationSection): void {
    if (section === "chats") {
      router.push("/chat");
      return;
    }

    router.push("/people");
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "unauthenticated") {
    return <main className="min-h-[100dvh]" />;
  }

  if (status === "initializing") {
    return (
      <AppWorkspace className="flex flex-col">
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <section aria-busy="true" className="space-y-4 text-center">
            <span className="sr-only" role="status">
              Loading your account…
            </span>
            <Skeleton className="mx-auto h-6 w-40 rounded" />
            {bootstrapError ? (
              <button
                className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                onClick={() => void bootstrapSession()}
                type="button"
              >
                Try again
              </button>
            ) : null}
          </section>
        </div>
      </AppWorkspace>
    );
  }

  if (profileQuery.isPending) {
    return (
      <AppWorkspace className="flex flex-col">
        <PeopleHeader
          avatar={null}
          displayName={null}
          onOpenProfile={() => router.push("/profile")}
          onNavigate={navigate}
          username={null}
        />
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <Skeleton className="h-6 w-32 rounded" />
        </div>
      </AppWorkspace>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <AppWorkspace className="flex flex-col">
        <PeopleHeader
          avatar={null}
          displayName={null}
          onOpenProfile={() => router.push("/profile")}
          onNavigate={navigate}
          username={null}
        />
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <section className="max-w-md space-y-3 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              People is unavailable.
            </h1>
            <p className="text-sm text-foreground-muted">
              Please try again shortly.
            </p>
            <button
              className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => void profileQuery.refetch()}
              type="button"
            >
              Retry
            </button>
          </section>
        </div>
      </AppWorkspace>
    );
  }

  const { account, profile } = profileQuery.data;

  if (!profile.displayName?.trim() || account.username === null) {
    return (
      <UsernameSetupScreen
        currentDisplayName={profile.displayName}
        currentUsername={account.username}
        needsDisplayName={!profile.displayName?.trim()}
        needsUsername={account.username === null}
      />
    );
  }

  return (
    <AppWorkspace className="flex flex-col">
      <PeopleHeader
        avatar={profile.avatar}
        displayName={profile.displayName}
        onOpenProfile={() => router.push("/profile")}
        onNavigate={navigate}
        username={account.username}
      />
      <ConnectionsPanel currentAccountId={account.id} />
    </AppWorkspace>
  );
}
