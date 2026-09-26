"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppWorkspace } from "@/components/layout/app-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStatus } from "@/features/auth/session/use-session-status";

import { getProfileDisplayName, ProfileAvatar } from "./profile-avatar";
import { useCurrentProfile } from "../hooks/use-current-profile";

function ProfileWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  return <AppWorkspace className="flex flex-col">{children}</AppWorkspace>;
}

function ProfileHeader({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <header className="flex min-h-[4.5rem] shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
      <button
        className="min-h-10 rounded-lg px-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
        onClick={onBack}
        type="button"
      >
        Back to chats
      </button>
      <h1 className="text-lg font-semibold text-foreground">Profile</h1>
    </header>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { status } = useSessionStatus();
  const profileQuery = useCurrentProfile(status === "authenticated");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "unauthenticated") {
    return <main className="min-h-[100dvh]" />;
  }

  if (profileQuery.isPending) {
    return (
      <ProfileWorkspace>
        <ProfileHeader onBack={() => router.push("/chat")} />
        <div aria-busy="true" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-10 sm:px-10 sm:py-12">
            <span className="sr-only" role="status">
              Loading your profile…
            </span>
            <Skeleton className="size-24 rounded-full sm:size-28" />
            <Skeleton className="mt-5 h-8 w-48 max-w-full rounded" />
            <Skeleton className="mt-3 h-4 w-28 rounded" />
            <div className="mt-10 w-full max-w-xl border-t border-border pt-6">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="mt-4 h-4 w-full rounded" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded" />
            </div>
          </div>
        </div>
      </ProfileWorkspace>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileWorkspace>
        <ProfileHeader onBack={() => router.push("/chat")} />
        <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-5 sm:p-10">
          <section className="w-full max-w-2xl space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Your profile is unavailable.
            </h2>
            <p className="text-sm leading-6 text-foreground-muted">
              Please try again shortly.
            </p>
            <button
              className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => profileQuery.refetch()}
              type="button"
            >
              Try again
            </button>
          </section>
        </div>
      </ProfileWorkspace>
    );
  }

  const { account, profile } = profileQuery.data;
  const identity = getProfileDisplayName(profile.displayName, account.username);

  return (
    <ProfileWorkspace>
      <ProfileHeader onBack={() => router.push("/chat")} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <ProfileAvatar name={identity} size="lg" url={profile.avatar} />
            <h2 className="mt-5 max-w-full break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {identity}
            </h2>
            {account.username ? (
              <p className="mt-1 max-w-full truncate text-sm text-foreground-muted">
                @{account.username}
              </p>
            ) : null}
          </div>
          {profile.bio?.trim() ? (
            <section
              className="mx-auto mt-10 max-w-2xl border-t border-border pt-6"
              aria-labelledby="profile-about"
            >
              <h3
                id="profile-about"
                className="text-sm font-semibold text-foreground"
              >
                About
              </h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground-muted">
                {profile.bio}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </ProfileWorkspace>
  );
}
