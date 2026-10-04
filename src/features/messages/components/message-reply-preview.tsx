import { getProfileDisplayName } from "@/features/profile/components/profile-avatar";

import type { ReplyMessagePreview } from "../types";

type MessageReplyPreviewProps = Readonly<{
  compact?: boolean;
  onClick?: () => void;
  outgoing?: boolean;
  replyTo: ReplyMessagePreview;
}>;

function ReplyPreviewContent({
  replyTo,
}: Readonly<{
  replyTo: ReplyMessagePreview;
}>) {
  const senderName = getProfileDisplayName(
    replyTo.sender.profile?.displayName ?? null,
    replyTo.sender.username,
  );
  const username =
    replyTo.sender.profile?.displayName && replyTo.sender.username
      ? ` · @${replyTo.sender.username}`
      : "";

  if (replyTo.deleted) {
    return (
      <>
        <span className="block truncate text-xs font-semibold leading-4">
          {senderName}
          {username ? (
            <span className="font-medium opacity-75">{username}</span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-xs leading-4 opacity-70">
          Original message deleted
        </span>
      </>
    );
  }

  return (
    <>
      <span className="block truncate text-xs font-semibold leading-4">
        {senderName}
        {username ? (
          <span className="font-medium opacity-75">{username}</span>
        ) : null}
      </span>
      {replyTo.content ? (
        <span className="mt-1 block truncate text-xs leading-4 opacity-70">
          {replyTo.content}
        </span>
      ) : null}
      {replyTo.hasAttachments ? (
        <span className="mt-1 block truncate text-xs leading-4 opacity-70">
          Photo
        </span>
      ) : null}
    </>
  );
}

export function MessageReplyPreview({
  compact = false,
  onClick,
  outgoing = false,
  replyTo,
}: MessageReplyPreviewProps) {
  const className = `block w-full text-left text-inherit ${
    compact
      ? "px-0 py-0"
      : `rounded-lg border-l-2 px-3 py-2.5 ${
          outgoing
            ? "border-message-outgoing-foreground/60 bg-message-outgoing-foreground/10"
            : "border-primary/55 bg-surface-muted/80"
        }`
  }`;

  return onClick ? (
    <button
      aria-label={`Go to replied message from ${getProfileDisplayName(
        replyTo.sender.profile?.displayName ?? null,
        replyTo.sender.username,
      )}`}
      className={`${className} transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40`}
      onClick={onClick}
      type="button"
    >
      <ReplyPreviewContent replyTo={replyTo} />
    </button>
  ) : (
    <div className={className}>
      <ReplyPreviewContent replyTo={replyTo} />
    </div>
  );
}
