import { getProfileDisplayName } from "@/features/profile/components/profile-avatar";

import type { ReplyMessagePreview } from "../types";

type MessageReplyPreviewProps = Readonly<{
  onClick?: () => void;
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
        <span className="block truncate text-xs font-semibold">
          {senderName}
          {username}
        </span>
        <span className="mt-0.5 block truncate text-xs opacity-75">
          Original message deleted
        </span>
      </>
    );
  }

  return (
    <>
      <span className="block truncate text-xs font-semibold">
        {senderName}
        {username}
      </span>
      {replyTo.content ? (
        <span className="mt-0.5 block truncate text-xs opacity-80">
          {replyTo.content}
        </span>
      ) : null}
      {replyTo.hasAttachments ? (
        <span className="mt-0.5 block truncate text-xs opacity-80">
          Attachment
        </span>
      ) : null}
    </>
  );
}

export function MessageReplyPreview({
  onClick,
  replyTo,
}: MessageReplyPreviewProps) {
  const className =
    "block w-full border-l-2 border-current/40 bg-black/5 px-2.5 py-2 text-left text-inherit dark:bg-white/10";

  return onClick ? (
    <button
      aria-label={`Go to replied message from ${getProfileDisplayName(
        replyTo.sender.profile?.displayName ?? null,
        replyTo.sender.username,
      )}`}
      className={`${className} rounded-md transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 dark:hover:bg-white/15`}
      onClick={onClick}
      type="button"
    >
      <ReplyPreviewContent replyTo={replyTo} />
    </button>
  ) : (
    <div className={`${className} rounded-md`}>
      <ReplyPreviewContent replyTo={replyTo} />
    </div>
  );
}
