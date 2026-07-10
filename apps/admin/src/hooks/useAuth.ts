import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loginRequest, logoutRequest, fetchMe, type SessionUser } from '../lib/auth';

export type { SessionUser };

export type Session = {
  user: SessionUser;
};

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      await loginRequest(email, password);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    queryClient.setQueryData(['me'], null);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [queryClient]);

  const user = data ?? null;

  return {
    session: user ? ({ user } as Session) : null,
    user,
    isLoading: isPending,
    error,
    login,
    logout,
  };
}
