"use client";

import { useEffect, useState } from "react";

type ProfileAvatarProps = Readonly<{
  name: string;
  presenceStatus?: "ONLINE" | "OFFLINE" | "UNKNOWN";
  size?: "sm" | "header" | "md" | "lg";
  url: string | null;
}>;

const avatarSizeClassNames = {
  header: "size-10 text-sm",
  lg: "size-24 text-3xl sm:size-28",
  md: "size-12 text-sm",
  sm: "size-8 text-xs",
} as const;

const avatarSizePixels = {
  header: 40,
  lg: 112,
  md: 48,
  sm: 32,
} as const;

const onlineDotSizeClassNames = {
  header: "size-3",
  lg: "size-4",
  md: "size-3",
  sm: "size-2.5",
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

export function ProfileAvatar({
  name,
  presenceStatus,
  size = "md",
  url,
}: ProfileAvatarProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const initials = getInitials(name) || "P";
  const sizeClassName = avatarSizeClassNames[size];
  const sizePixels = avatarSizePixels[size];
  const onlineDotSizeClassName = onlineDotSizeClassNames[size];

  useEffect(() => {
    setFailedToLoad(false);
  }, [url]);

  const avatar =
    url && !failedToLoad ? (
      // Signed avatar URLs are backend-provided and may use different storage hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${name} avatar`}
        className={`${sizeClassName} aspect-square shrink-0 rounded-full border border-primary/20 object-cover`}
        height={sizePixels}
        onError={() => setFailedToLoad(true)}
        src={url}
        width={sizePixels}
      />
    ) : (
      <div
        className={`grid ${sizeClassName} aspect-square shrink-0 place-items-center overflow-hidden rounded-full border border-primary/20 bg-avatar font-semibold text-primary`}
      >
        {initials}
      </div>
    );

  return (
    <span className="relative inline-flex shrink-0 overflow-visible">
      {avatar}
      {presenceStatus === "ONLINE" ? (
        <span
          aria-label="Online"
          className={`absolute -bottom-0.5 -right-0.5 z-10 ${onlineDotSizeClassName} rounded-full border-2 border-surface bg-emerald-500`}
          role="img"
        />
      ) : null}
    </span>
  );
}
