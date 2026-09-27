import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCurrentProfile } from "../api/update-current-profile";
import { currentProfileQueryKey } from "./use-current-profile";

export function useUpdateCurrentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCurrentProfile,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: currentProfileQueryKey }),
  });
}
