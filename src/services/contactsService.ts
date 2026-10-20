import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Profile, UserBlock } from '../types';

export const contactsService = {
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return [];

    const cleanQuery = query.trim().replace(/^@/, '');

    // 1. If query is empty, return recent active users so User 2 is immediately visible!
    if (!cleanQuery) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .order('last_seen', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Error fetching all profiles:', error.message);
        return [];
      }
      return (data as Profile[]) || [];
    }

    // 2. Try database ILIKE search with quoted patterns
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike."%${cleanQuery}%",full_name.ilike."%${cleanQuery}%"`)
        .neq('id', currentUserId)
        .limit(50);

      if (!error && data && data.length > 0) {
        return data as Profile[];
      }
    } catch (err) {
      console.warn('PostgREST search error, falling back to client filter:', err);
    }

    // 3. Fallback: fetch users and filter client-side (handles Cyrillic, spaces, case differences)
    try {
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .limit(100);

      if (allUsers) {
        const q = cleanQuery.toLowerCase();
        return (allUsers as Profile[]).filter(
          (u) =>
            u.username?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q) ||
            (u.bio && u.bio.toLowerCase().includes(q))
        );
      }
    } catch (err) {
      console.error('Fallback user search failed:', err);
    }

    return [];
  },

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });

    if (error) throw error;
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) throw error;
  },

  async getBlockedUsers(currentUserId: string): Promise<UserBlock[]> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return [];

    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        *,
        blocked_profile:profiles!user_blocks_blocked_id_fkey(*)
      `)
      .eq('blocker_id', currentUserId);

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return (data as any) || [];
  },
};
