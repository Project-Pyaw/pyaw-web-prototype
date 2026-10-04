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
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";
import { UsernameSetupScreen } from "@/features/profile/components/username-setup-screen";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

import { ConnectionsPanel } from "./connections-panel";

function PeopleHeader({
  avatar,
  identity,
  onNavigate,
}: Readonly<{
  avatar: string | null;
  identity: string;
  onNavigate: (section: AppNavigationSection) => void;
}>) {
  return (
    <AppHeader
      activeSection="people"
      endContent={
        <button
          aria-label={`Open profile for ${identity}`}
          className="rounded-full p-1.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
          onClick={() => onNavigate("profile")}
          type="button"
        >
          <ProfileAvatar name={identity} size="sm" url={avatar} />
        </button>
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

    if (section === "profile") {
      router.push("/profile");
    }
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
          identity="Pyaw member"
          onNavigate={navigate}
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
          identity="Pyaw member"
          onNavigate={navigate}
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
        identity={getProfileDisplayName(profile.displayName, account.username)}
        onNavigate={navigate}
      />
      <ConnectionsPanel currentAccountId={account.id} />
    </AppWorkspace>
  );
}
