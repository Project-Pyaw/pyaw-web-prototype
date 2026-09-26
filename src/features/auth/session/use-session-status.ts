"use client";

import { useSyncExternalStore } from "react";

import {
  getSessionSnapshot,
  subscribeToSession,
  type SessionSnapshot,
} from "./session";

const serverSnapshot: SessionSnapshot = {
  bootstrapError: false,
  status: "initializing",
};

export function useSessionStatus(): SessionSnapshot {
  return useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    () => serverSnapshot,
  );
}
