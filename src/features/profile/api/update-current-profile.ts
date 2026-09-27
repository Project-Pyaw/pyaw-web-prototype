import { authenticatedApi } from "@/features/auth/session/session";

type UpdateCurrentProfileResponse = Readonly<{
  accountId: string;
  avatar: string | null;
  bio: string | null;
  displayName: string | null;
  id: string;
}>;

export function updateCurrentProfile(
  displayName: string,
): Promise<UpdateCurrentProfileResponse> {
  return authenticatedApi.patch<
    UpdateCurrentProfileResponse,
    { displayName: string }
  >("/profile/me", { displayName });
}
