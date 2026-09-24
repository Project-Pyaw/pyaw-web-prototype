"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSessionStatus } from "@/features/auth/session/use-session-status";

export function ChatPlaceholder() {
  const router = useRouter();
  const { status } = useSessionStatus();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "unauthenticated") {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Pyaw</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          You’re signed in.
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Chat is coming in a later phase.
        </p>
      </section>
    </main>
  );
}
