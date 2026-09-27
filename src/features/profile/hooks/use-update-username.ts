import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUsername } from "../api/update-username";
import { currentProfileQueryKey } from "./use-current-profile";

export function useUpdateUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUsername,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: currentProfileQueryKey }),
  });
}
