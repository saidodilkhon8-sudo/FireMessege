import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Profile } from '../types';

export const authService = {
  async ensureProfile(
    user: any,
    fallbackUsername?: string,
    fallbackFullName?: string
  ): Promise<Profile | null> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured || !user?.id) return null;

    try {
      // 1. Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) {
        return existing as Profile;
      }

      // 2. Profile missing -> construct and insert
      const meta = user.user_metadata || {};
      const username = (
        fallbackUsername ||
        meta.username ||
        user.email?.split('@')[0] ||
        `user_${user.id.slice(0, 8)}`
      )
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '') || `user_${user.id.slice(0, 8)}`;

      const fullName = (
        fallbackFullName ||
        meta.full_name ||
        user.email?.split('@')[0] ||
        'FireMessage User'
      ).trim();

      const newProfile = {
        id: user.id,
        username,
        full_name: fullName,
        status: 'online' as const,
        bio: 'Futuristic Messenger Member',
        last_seen: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (insertErr) {
        console.warn('Could not auto-insert profile into public.profiles:', insertErr.message);
      }
      return (inserted as Profile) || (newProfile as Profile);
    } catch (err) {
      console.warn('ensureProfile error:', err);
      return null;
    }
  },

  async signUp(email: string, password: string, username: string, fullName: string) {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) {
      throw new Error('Supabase is not configured yet. Please configure your project URL and Anon Key in Settings.');
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanFullName = fullName.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: cleanFullName,
        },
      },
    });

    if (error) throw error;

    // Immediately guarantee profile row in public.profiles
    if (data?.user) {
      await this.ensureProfile(data.user, cleanUsername, cleanFullName);
    }

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

    // Ensure profile row exists on login
    if (data?.user) {
      await this.ensureProfile(data.user);
    }

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

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return data as Profile;
    }

    // Auto-heal missing profile from active session
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (user && user.id === userId) {
      return this.ensureProfile(user);
    }

    return null;
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
