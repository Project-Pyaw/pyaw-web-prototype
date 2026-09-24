"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { useCurrentProfile } from "@/features/profile/hooks/use-current-profile";

type AvatarProps = Readonly<{
  name: string;
  url: string | null;
}>;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Avatar({ name, url }: AvatarProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const initials = getInitials(name) || "P";

  if (url && !failedToLoad) {
    return (
      // Signed avatar URLs are backend-provided and may use different storage hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${name} avatar`}
        className="size-12 rounded-full border border-border object-cover"
        onError={() => setFailedToLoad(true)}
        src={url}
      />
    );
  }

  return (
    <div className="grid size-12 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}

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
  const identity = profile.displayName ?? account.username ?? "Pyaw member";

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="max-w-md space-y-3 rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar
            key={profile.avatar ?? "fallback"}
            name={identity}
            url={profile.avatar}
          />
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
        <p className="text-sm leading-6 text-foreground-muted">
          Chat is coming in a later phase.
        </p>
      </section>
    </main>
  );
}
