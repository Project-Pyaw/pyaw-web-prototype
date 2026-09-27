import { authenticatedApi } from "@/features/auth/session/session";

type UpdateUsernameResponse = Readonly<{
  username: string;
}>;

export function updateUsername(
  username: string,
): Promise<UpdateUsernameResponse> {
  return authenticatedApi.patch<UpdateUsernameResponse, { username: string }>(
    "/accounts/me/username",
    { username },
  );
}
