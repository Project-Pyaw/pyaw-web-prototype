"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import {
  AppHeader,
  type AppNavigationSection,
} from "@/components/layout/app-header";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { bootstrapSession } from "@/features/auth/session/session";
import { useSessionStatus } from "@/features/auth/session/use-session-status";

import { getProfileDisplayName, ProfileAvatar } from "./profile-avatar";
import { useCurrentProfile } from "../hooks/use-current-profile";

function ProfileWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  return <AppWorkspace className="flex flex-col">{children}</AppWorkspace>;
}

function ProfileHeader({
  onNavigate,
}: Readonly<{ onNavigate: (section: AppNavigationSection) => void }>) {
  return (
    <AppHeader
      activeSection="profile"
      onBrandClick={() => onNavigate("chats")}
      onNavigate={onNavigate}
    />
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { bootstrapError, status } = useSessionStatus();
  const profileQuery = useCurrentProfile(status === "authenticated");

  function navigateFromProfile(section: AppNavigationSection) {
    if (section === "connections") {
      router.push("/chat?workspace=connections");
      return;
    }

    router.push(section === "chats" ? "/chat" : "/profile");
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
      <ProfileWorkspace>
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
      </ProfileWorkspace>
    );
  }

  if (profileQuery.isPending) {
    return (
      <ProfileWorkspace>
        <ProfileHeader onNavigate={navigateFromProfile} />
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
        <ProfileHeader onNavigate={navigateFromProfile} />
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
      <ProfileHeader onNavigate={navigateFromProfile} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Your account</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Settings &amp; Profile
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              Your public profile and account details in one place.
            </p>
          </div>
          <section
            aria-labelledby="profile-details-title"
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-col gap-5 border-b border-border p-5 sm:flex-row sm:items-center sm:p-6">
              <ProfileAvatar name={identity} size="lg" url={profile.avatar} />
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold text-foreground"
                  id="profile-details-title"
                >
                  Profile
                </p>
                <h3 className="mt-1 break-words text-xl font-semibold tracking-tight text-foreground">
                  {identity}
                </h3>
                {account.username ? (
                  <p className="mt-1 truncate text-sm text-foreground-muted">
                    @{account.username}
                  </p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-emerald-500"
                  />
                  {account.status === "ACTIVE"
                    ? "Active account"
                    : account.status}
                </span>
              </div>
            </div>
            <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="min-w-0 p-5 sm:p-6">
                <dt className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Display name
                </dt>
                <dd className="mt-2 truncate text-sm font-medium text-foreground">
                  {identity}
                </dd>
              </div>
              <div className="min-w-0 p-5 sm:p-6">
                <dt className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Username
                </dt>
                <dd className="mt-2 truncate text-sm font-medium text-foreground">
                  {account.username ? `@${account.username}` : "Not set"}
                </dd>
              </div>
            </dl>
            <div className="border-t border-border p-5 sm:p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                About
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                {profile.bio?.trim() || "No profile description yet."}
              </p>
            </div>
          </section>
          <section
            className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6"
            aria-labelledby="account-details-title"
          >
            <h3
              className="text-lg font-semibold text-foreground"
              id="account-details-title"
            >
              Account details
            </h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Contact information associated with this account.
            </p>
            <div className="mt-5 rounded-xl bg-surface-muted px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Phone number
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {account.phone}
              </p>
            </div>
          </section>
        </div>
      </div>
    </ProfileWorkspace>
  );
}
