"use client";

import { useEffect, useState } from "react";

type ProfileAvatarProps = Readonly<{
  name: string;
  size?: "sm" | "header" | "md" | "lg";
  url: string | null;
}>;

const avatarSizeClassNames = {
  header: "size-10 text-sm",
  lg: "size-24 text-3xl sm:size-28",
  md: "size-12 text-sm",
  sm: "size-8 text-xs",
} as const;

export function getProfileDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
): string {
  return displayName?.trim() || username?.trim() || "Pyaw member";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileAvatar({ name, size = "md", url }: ProfileAvatarProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const initials = getInitials(name) || "P";
  const sizeClassName = avatarSizeClassNames[size];

  useEffect(() => {
    setFailedToLoad(false);
  }, [url]);

  if (url && !failedToLoad) {
    return (
      // Signed avatar URLs are backend-provided and may use different storage hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${name} avatar`}
        className={`${sizeClassName} aspect-square shrink-0 rounded-full border border-primary/20 object-cover`}
        onError={() => setFailedToLoad(true)}
        src={url}
      />
    );
  }

  return (
    <div
      className={`grid ${sizeClassName} aspect-square shrink-0 place-items-center overflow-hidden rounded-full border border-primary/20 bg-avatar font-semibold text-primary`}
    >
      {initials}
    </div>
  );
}
