"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { ConnectionsPanel } from "@/features/connections/components/connections-panel";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

export function ChatPlaceholder() {
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
  const identity = getProfileDisplayName(profile.displayName, account.username);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <section className="mx-auto max-w-2xl space-y-8 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <ProfileAvatar name={identity} url={profile.avatar} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Pyaw</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {identity}
            </h1>
            {account.username ? (
              <p className="truncate text-sm text-foreground-muted">
                @{account.username}
              </p>
            ) : null}
          </div>
        </div>
        <ConnectionsPanel currentAccountId={account.id} />
      </section>
    </main>
  );
}
