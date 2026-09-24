"use client";

import { useEffect, useState } from "react";

type ProfileAvatarProps = Readonly<{
  name: string;
  url: string | null;
}>;

export function getProfileDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
): string {
  return displayName ?? username ?? "Pyaw member";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileAvatar({ name, url }: ProfileAvatarProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const initials = getInitials(name) || "P";

  useEffect(() => {
    setFailedToLoad(false);
  }, [url]);

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
    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}
