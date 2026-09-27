import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import type { CurrentUserDTO } from "@reachinbox/shared";

export function useCurrentUser() {
  return useQuery<CurrentUserDTO, ApiError>({
    queryKey: ["me"],
    queryFn: () => api.get<CurrentUserDTO>("/api/auth/me"),
    retry: false,
  });
}
