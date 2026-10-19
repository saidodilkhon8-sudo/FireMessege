import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { Profile } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const p = await authService.getProfile(userId);
      setProfile(p);
      if (p) {
        await authService.updateStatus(userId, 'online');
      }
    } catch (err: any) {
      console.warn('Error fetching profile:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      const { isConfigured } = getStoredSupabaseConfig();
      if (!isConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const session = await authService.getCurrentSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        console.warn('Init auth session error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const { data } = authService.onAuthStateChange(async (session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    const handleBeforeUnload = () => {
      if (user?.id) {
        authService.updateStatus(user.id, 'offline');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      data?.subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      const res = await authService.signIn(email, pass);
      if (res.user) {
        setUser(res.user);
        await fetchProfile(res.user.id);
      }
      return res;
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const signUp = async (email: string, pass: string, username: string, fullName: string) => {
    setAuthError(null);
    try {
      const res = await authService.signUp(email, pass, username, fullName);
      if (res.user) {
        setUser(res.user);
        await fetchProfile(res.user.id);
      }
      return res;
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create account');
      throw err;
    }
  };

  const signOut = async () => {
    if (user?.id) {
      await authService.updateStatus(user.id, 'offline');
    }
    await authService.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) throw new Error('Not logged in');
    const updated = await authService.updateProfile(user.id, updates);
    setProfile(updated);
    return updated;
  };

  return {
    user,
    profile,
    isLoading,
    authError,
    setAuthError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
