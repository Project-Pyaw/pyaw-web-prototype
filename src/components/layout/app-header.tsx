import type { ReactNode } from "react";

export type AppNavigationSection = "chats" | "connections" | "profile";

type AppHeaderProps = Readonly<{
  activeSection: AppNavigationSection;
  endContent?: ReactNode;
  onBrandClick: () => void;
  onNavigate: (section: AppNavigationSection) => void;
}>;

type AppNavigationItemProps = Readonly<{
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick: () => void;
}>;

const navigationItems: ReadonlyArray<
  Readonly<{
    label: string;
    section: AppNavigationSection;
    className?: string;
  }>
> = [
  { label: "Chats", section: "chats" },
  { label: "People", section: "connections" },
  {
    className: "hidden lg:flex",
    label: "Settings & Profile",
    section: "profile",
  },
];

export function AppHeader({
  activeSection,
  endContent,
  onBrandClick,
  onNavigate,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <button
        className="flex shrink-0 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
        onClick={onBrandClick}
        type="button"
      >
        <span className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v10A1.5 1.5 0 0 1 17.5 17H10l-4.5 3v-3.6A1.5 1.5 0 0 1 5 15.5v-10Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
        <span className="hidden text-xl font-bold tracking-tight text-foreground sm:block">
          Pyaw
        </span>
      </button>
      <nav
        aria-label="Primary navigation"
        className="ml-2 flex h-full items-center gap-1 sm:ml-6"
      >
        {navigationItems.map((item) => (
          <AppNavigationItem
            active={item.section === activeSection}
            className={item.className}
            key={item.section}
            onClick={() => onNavigate(item.section)}
          >
            {item.label}
          </AppNavigationItem>
        ))}
      </nav>
      {endContent ? <div className="ml-auto">{endContent}</div> : null}
    </header>
  );
}

function AppNavigationItem({
  active = false,
  children,
  className = "",
  onClick,
}: AppNavigationItemProps) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex h-16 items-center px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full motion-reduce:transition-none ${
        active
          ? "font-semibold text-primary after:bg-primary"
          : "text-foreground-muted hover:bg-surface-muted hover:text-primary"
      } ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
