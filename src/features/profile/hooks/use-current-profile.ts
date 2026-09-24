import { useQuery } from "@tanstack/react-query";

import { getCurrentProfile } from "../api/get-current-profile";

export const currentProfileQueryKey = ["current-profile"] as const;

export function useCurrentProfile(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getCurrentProfile,
    queryKey: currentProfileQueryKey,
    staleTime: 60_000,
  });
}
