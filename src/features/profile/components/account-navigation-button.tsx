import { getProfileDisplayName, ProfileAvatar } from "./profile-avatar";

type AccountNavigationButtonProps = Readonly<{
  avatar: string | null;
  displayName: string | null;
  onClick: () => void;
  username: string | null;
}>;

export function AccountNavigationButton({
  avatar,
  displayName,
  onClick,
  username,
}: AccountNavigationButtonProps) {
  const identity = getProfileDisplayName(displayName, username);

  return (
    <button
      aria-label={`Open profile for ${identity}`}
      className="flex min-w-0 items-center gap-2 rounded-full p-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
      onClick={onClick}
      type="button"
    >
      <span className="hidden min-w-0 xl:block">
        <span className="block max-w-28 truncate text-sm font-medium text-foreground">
          {identity}
        </span>
      </span>
      <ProfileAvatar name={identity} size="sm" url={avatar} />
    </button>
  );
}
