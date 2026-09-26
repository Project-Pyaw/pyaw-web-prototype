import type { ReactNode } from "react";

type AppWorkspaceProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function AppWorkspace({ children, className = "" }: AppWorkspaceProps) {
  return (
    <main className="h-screen h-[100dvh] overflow-hidden bg-background">
      <section
        className={`mx-auto h-full max-w-none overflow-hidden bg-surface ${className}`}
      >
        {children}
      </section>
    </main>
  );
}
