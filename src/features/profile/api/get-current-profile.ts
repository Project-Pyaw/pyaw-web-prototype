import { authenticatedApi } from "@/features/auth/session/session";

import type { CurrentUserProfile } from "../types";

export function getCurrentProfile(): Promise<CurrentUserProfile> {
  return authenticatedApi.get<CurrentUserProfile>("/profile/me");
}
