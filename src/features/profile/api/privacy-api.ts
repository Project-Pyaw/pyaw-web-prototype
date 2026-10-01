import { authenticatedApi } from "@/features/auth/session/session";

export type AccountPrivacySettings = Readonly<{
  lastSeenVisibleToConnections: boolean;
  onlineVisibleToConnections: boolean;
}>;

export type UpdateAccountPrivacySettingsInput = Readonly<
  Partial<AccountPrivacySettings>
>;

export function getAccountPrivacySettings(): Promise<AccountPrivacySettings> {
  return authenticatedApi.get<AccountPrivacySettings>("/accounts/me/privacy");
}

export function updateAccountPrivacySettings(
  input: UpdateAccountPrivacySettingsInput,
): Promise<AccountPrivacySettings> {
  return authenticatedApi.patch<
    AccountPrivacySettings,
    UpdateAccountPrivacySettingsInput
  >("/accounts/me/privacy", input);
}
