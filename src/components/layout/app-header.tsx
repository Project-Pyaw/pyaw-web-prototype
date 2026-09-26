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
  { label: "Connections", section: "connections" },
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
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-5 sm:px-6">
      <button
        className="flex shrink-0 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
        onClick={onBrandClick}
        type="button"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm shadow-primary/20">
          P
        </span>
        <span className="text-xl font-bold tracking-tight text-foreground">
          Pyaw
        </span>
      </button>
      <nav
        aria-label="Primary navigation"
        className="flex h-full min-w-0 items-center gap-1 sm:gap-4"
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
      className={`relative inline-flex h-16 items-center px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full motion-reduce:transition-none sm:px-3 sm:after:left-3 sm:after:right-3 ${
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
