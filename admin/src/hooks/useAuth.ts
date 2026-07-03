import { useCallback } from 'react';
import { authClient } from '../lib/auth';

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  image?: string;
};

export type Session = {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
  };
};

export function useAuth() {
  const { data, isPending, error } = authClient.useSession();

  const login = useCallback(async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const result = await authClient.signUp.email({ email, password, name });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
  }, []);

  return {
    session: data ? (data as unknown as Session) : null,
    user: data?.user ?? null,
    isLoading: isPending,
    error,
    login,
    signup,
    logout,
  };
}
