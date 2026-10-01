import { authenticatedApi } from "@/features/auth/session/session";

export type UpdateCurrentProfileInput = Readonly<{
  bio?: string | null;
  displayName?: string;
}>;

type UpdateCurrentProfileResponse = Readonly<{
  accountId: string;
  avatar: string | null;
  bio: string | null;
  displayName: string | null;
  id: string;
}>;

export function updateCurrentProfile(
  input: UpdateCurrentProfileInput,
): Promise<UpdateCurrentProfileResponse> {
  return authenticatedApi.patch<
    UpdateCurrentProfileResponse,
    UpdateCurrentProfileInput
  >("/profile/me", input);
}
