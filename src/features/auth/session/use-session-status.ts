"use client";

import { useSyncExternalStore } from "react";

import {
  getSessionSnapshot,
  subscribeToSession,
  type SessionSnapshot,
} from "./session";

const serverSnapshot: SessionSnapshot = {
  status: "unauthenticated",
};

export function useSessionStatus(): SessionSnapshot {
  return useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    () => serverSnapshot,
  );
}
