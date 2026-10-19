import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Profile, UserBlock } from '../types';

export const contactsService = {
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return [];

    const cleanQuery = query.trim().replace(/^@/, '');
    if (!cleanQuery) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
      .neq('id', currentUserId)
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return (data as Profile[]) || [];
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
