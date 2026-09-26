import type { ReactNode } from "react";

type AppWorkspaceProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function AppWorkspace({ children, className = "" }: AppWorkspaceProps) {
  return (
    <main className="h-screen h-[100dvh] overflow-hidden bg-background md:p-4 lg:p-6">
      <section
        className={`mx-auto h-full max-w-[90rem] overflow-hidden bg-surface md:h-[calc(100dvh-2rem)] md:rounded-2xl md:border md:border-border lg:h-[calc(100dvh-3rem)] ${className}`}
      >
        {children}
      </section>
    </main>
  );
}
