import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Profile } from '../types';

export const authService = {
  async signUp(email: string, password: string, username: string, fullName: string) {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) {
      throw new Error('Supabase is not configured yet. Please configure your project URL and Anon Key in Settings.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          full_name: fullName.trim(),
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) {
      throw new Error('Supabase is not configured yet. Please configure your project URL and Anon Key in Settings.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) {
      throw new Error('Supabase is not configured yet.');
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });

    if (error) throw error;
    return data;
  },

  async getCurrentSession() {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Get session error:', error.message);
      return null;
    }
    return data.session;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Profile fetch warning:', error.message);
      return null;
    }

    return data as Profile;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async updateStatus(userId: string, status: Profile['status']) {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return;

    await supabase
      .from('profiles')
      .update({
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
  },

  onAuthStateChange(callback: (session: any) => void) {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },
};
