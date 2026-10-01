import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAccountPrivacySettings,
  updateAccountPrivacySettings,
} from "../api/privacy-api";

export const accountPrivacyQueryKey = ["account-privacy"] as const;

export function useAccountPrivacy(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getAccountPrivacySettings,
    queryKey: accountPrivacyQueryKey,
  });
}

export function useUpdateAccountPrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccountPrivacySettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(accountPrivacyQueryKey, settings);
      await queryClient.invalidateQueries({ queryKey: accountPrivacyQueryKey });
    },
  });
}
