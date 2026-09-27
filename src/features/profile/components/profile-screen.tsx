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
  avatar,
  identity,
  onNavigate,
  username,
}: Readonly<{
  avatar: string | null;
  identity: string;
  onNavigate: (section: AppNavigationSection) => void;
  username: string | null;
}>) {
  return (
    <AppHeader
      activeSection="profile"
      endContent={
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-foreground lg:block">
            {username ? `@${username}` : identity}
          </span>
          <span className="relative">
            <ProfileAvatar name={identity} size="sm" url={avatar} />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-emerald-500" />
          </span>
        </div>
      }
      onBrandClick={() => onNavigate("chats")}
      onNavigate={onNavigate}
    />
  );
}

function ProfileNavigationItem({
  active = false,
  children,
  icon,
}: Readonly<{ active?: boolean; children: ReactNode; icon: ReactNode }>) {
  return (
    <div
      className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-medium ${
        active ? "bg-primary/15 text-primary" : "text-foreground-muted"
      }`}
    >
      <span aria-hidden="true" className="grid size-5 place-items-center">
        {icon}
      </span>
      {children}
      {active ? (
        <span
          aria-hidden="true"
          className="ml-auto size-1.5 rounded-full bg-primary"
        />
      ) : null}
    </div>
  );
}

function ProfileField({
  children,
  label,
}: Readonly<{ children: string; label: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </span>
      <input
        className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground outline-none"
        readOnly
        type="text"
        value={children}
      />
    </label>
  );
}

function SettingRow({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-xl text-primary"
      >
        ♧
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>
      </div>
      <span
        aria-label={`${title} enabled`}
        className="ml-auto inline-flex h-7 w-12 shrink-0 items-center justify-end rounded-full bg-primary p-1"
        role="img"
      >
        <span className="size-5 rounded-full bg-white" />
      </span>
    </div>
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
        <ProfileHeader
          avatar={null}
          identity="Pyaw member"
          onNavigate={navigateFromProfile}
          username={null}
        />
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
        <ProfileHeader
          avatar={null}
          identity="Pyaw member"
          onNavigate={navigateFromProfile}
          username={null}
        />
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
      <ProfileHeader
        avatar={profile.avatar}
        identity={identity}
        onNavigate={navigateFromProfile}
        username={account.username}
      />
      <div className="grid min-h-0 flex-1 bg-background lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border bg-surface p-5 lg:block">
          <div className="rounded-2xl bg-input p-4">
            <div className="flex items-center gap-3">
              <span className="relative">
                <ProfileAvatar name={identity} size="md" url={profile.avatar} />
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-input bg-emerald-500" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  {identity}
                </p>
                {account.username ? (
                  <p className="truncate text-sm text-foreground-muted">
                    @{account.username}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs font-medium text-foreground-muted">
                  <span className="text-emerald-500">●</span>{" "}
                  {account.status === "ACTIVE"
                    ? "Online • Available"
                    : account.status}
                </p>
              </div>
            </div>
          </div>
          <nav aria-label="Profile navigation" className="mt-5 space-y-2">
            <ProfileNavigationItem active icon="●">
              Profile
            </ProfileNavigationItem>
            <ProfileNavigationItem icon="⚙">Settings</ProfileNavigationItem>
            <ProfileNavigationItem icon="⊘">
              Blocked Users
            </ProfileNavigationItem>
            <ProfileNavigationItem icon="ⓘ">About</ProfileNavigationItem>
          </nav>
          <div className="mt-5 border-t border-border pt-4">
            <ProfileNavigationItem icon="?">
              Help &amp; Support
            </ProfileNavigationItem>
          </div>
        </aside>
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Profile
                </h2>
                <p className="mt-1 text-base text-foreground-muted">
                  Manage your public information, avatar, and contact
                  credentials.
                </p>
              </div>
              <button
                aria-label="Saving profile changes is not available yet"
                className="min-h-12 cursor-not-allowed rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground"
                disabled
                type="button"
              >
                Save Changes
              </button>
            </div>
            <section
              aria-labelledby="profile-details-title"
              className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7"
            >
              <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
                <span className="relative w-fit">
                  <ProfileAvatar
                    name={identity}
                    size="lg"
                    url={profile.avatar}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full border-4 border-surface bg-primary text-lg text-primary-foreground"
                  >
                    ⌾
                  </span>
                </span>
                <div>
                  <h3
                    className="text-lg font-semibold text-foreground"
                    id="profile-details-title"
                  >
                    Profile Photo
                  </h3>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Your avatar is provided by your Pyaw profile.
                  </p>
                  <div className="mt-4 flex items-center gap-5">
                    <span className="rounded-full bg-input px-4 py-2 text-sm font-medium text-foreground">
                      Upload New
                    </span>
                    <span className="text-sm font-medium text-foreground-muted">
                      Remove
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <ProfileField label="Display Name">{identity}</ProfileField>
                <ProfileField label="Username">
                  {account.username ? `@${account.username}` : "Not set"}
                </ProfileField>
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  About / Bio
                </span>
                <textarea
                  className="min-h-24 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base leading-6 text-foreground outline-none"
                  readOnly
                  value={profile.bio?.trim() || "No profile description yet."}
                />
                <span className="mt-2 block text-right text-xs font-medium text-foreground-muted">
                  {profile.bio?.trim().length ?? 0} characters
                </span>
              </label>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <ProfileField label="Phone Number">
                  {account.phone}
                </ProfileField>
                <div className="rounded-2xl border border-border bg-input px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Account status
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {account.status === "ACTIVE"
                      ? "Verified active account"
                      : account.status}
                  </p>
                </div>
              </div>
            </section>
            <section aria-labelledby="settings-title" className="mt-10">
              <h2
                className="text-3xl font-semibold tracking-tight text-foreground"
                id="settings-title"
              >
                Settings
              </h2>
              <p className="mt-1 text-base text-foreground-muted">
                Control notification behaviors, security parameters, and
                conversation privacy.
              </p>
              <div className="mt-7 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                <SettingRow
                  description="Play soft chime on new incoming direct messages"
                  title="Sound Alerts"
                />
                <SettingRow
                  description="Display sender avatars and message snippets in popups"
                  title="Message Previews"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProfileWorkspace>
  );
}
