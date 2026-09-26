"use client";

import { useEffect, useState } from "react";

import { subscribeToPresenceUpdate } from "@/lib/socket/messages-socket";

import {
  mapPresenceUpdateEvent,
  type PresenceUpdateEvent,
} from "../realtime/presence-update";

export function useCounterpartPresence(accountId: string | undefined) {
  const [presence, setPresence] = useState<PresenceUpdateEvent | null>(null);

  useEffect(() => {
    setPresence(null);

    if (!accountId) {
      return;
    }

    return subscribeToPresenceUpdate((payload) => {
      const update = mapPresenceUpdateEvent(payload);

      if (update?.accountId === accountId) {
        setPresence(update);
      }
    });
  }, [accountId]);

  return presence;
}
