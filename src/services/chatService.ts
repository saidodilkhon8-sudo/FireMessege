import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Conversation, Message, MessageType } from '../types';

export const chatService = {
  async fetchConversations(userId: string): Promise<Conversation[]> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return [];

    // 1. Get all memberships for the current user
    const { data: memberships, error: memError } = await supabase
      .from('conversation_members')
      .select('conversation_id, is_pinned, is_muted, last_read_at, role')
      .eq('user_id', userId);

    if (memError || !memberships || memberships.length === 0) {
      return [];
    }

    const conversationIds = memberships.map((m) => m.conversation_id);

    // 2. Fetch conversation details
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (convError || !convData) {
      console.error('Error fetching conversations:', convError);
      return [];
    }

    // 3. For each conversation, fetch members and last message
    const conversations: Conversation[] = [];

    for (const conv of convData) {
      const membership = memberships.find((m) => m.conversation_id === conv.id);

      // Fetch other members with profiles
      const { data: members } = await supabase
        .from('conversation_members')
        .select(`
          id,
          conversation_id,
          user_id,
          role,
          joined_at,
          last_read_at,
          is_pinned,
          is_muted,
          profile:profiles(*)
        `)
        .eq('conversation_id', conv.id);

      // Fetch last message
      const { data: lastMessages } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('conversation_id', conv.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch unread count: messages newer than membership.last_read_at where sender != current user
      let unreadCount = 0;
      if (membership?.last_read_at) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .gt('created_at', membership.last_read_at)
          .is('deleted_at', null);

        unreadCount = count || 0;
      }

      // If direct, identify the other member's profile
      const otherMember =
        conv.type === 'direct'
          ? (members?.find((m: any) => m.user_id !== userId)?.profile as any)
          : undefined;

      conversations.push({
        ...conv,
        members: (members as any) || [],
        last_message: lastMessages && lastMessages[0] ? (lastMessages[0] as any) : undefined,
        unread_count: unreadCount,
        other_member: otherMember,
      });
    }

    // Sort: pinned first, then by last updated
    return conversations.sort((a, b) => {
      const aMem = memberships.find((m) => m.conversation_id === a.id);
      const bMem = memberships.find((m) => m.conversation_id === b.id);
      if (aMem?.is_pinned && !bMem?.is_pinned) return -1;
      if (!aMem?.is_pinned && bMem?.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  },

  async getOrCreateDirectConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) throw new Error('Supabase not configured');

    // Try RPC first
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
        other_user_id: otherUserId,
      });
      if (!error && data) {
        return data;
      }
    } catch {
      // Fallback to client query if RPC not yet run
    }

    // Manual fallback check
    const { data: myMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    if (myMemberships && myMemberships.length > 0) {
      const convIds = myMemberships.map((m) => m.conversation_id);
      const { data: commonMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversation:conversations!inner(type)')
        .eq('user_id', otherUserId)
        .in('conversation_id', convIds)
        .eq('conversation.type', 'direct')
        .limit(1);

      if (commonMemberships && commonMemberships.length > 0) {
        return commonMemberships[0].conversation_id;
      }
    }

    // Create new direct conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: currentUserId,
      })
      .select('id')
      .single();

    if (createError) throw createError;

    // Add both members
    const { error: membersError } = await supabase.from('conversation_members').insert([
      { conversation_id: newConv.id, user_id: currentUserId, role: 'member' },
      { conversation_id: newConv.id, user_id: otherUserId, role: 'member' },
    ]);

    if (membersError) throw membersError;

    return newConv.id;
  },

  async createGroupConversation(
    currentUserId: string,
    title: string,
    description: string,
    memberUserIds: string[],
    avatarUrl?: string
  ): Promise<string> {
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        title: title.trim(),
        description: description?.trim() || null,
        avatar_url: avatarUrl || null,
        created_by: currentUserId,
      })
      .select('id')
      .single();

    if (createError) throw createError;

    const allMembers = Array.from(new Set([currentUserId, ...memberUserIds]));
    const memberRows = allMembers.map((uid) => ({
      conversation_id: newConv.id,
      user_id: uid,
      role: uid === currentUserId ? 'owner' : 'member',
    }));

    const { error: membersError } = await supabase.from('conversation_members').insert(memberRows);
    if (membersError) throw membersError;

    return newConv.id;
  },

  async fetchMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) return [];

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*),
        attachments(*),
        reactions:message_reactions(*, profile:profiles(*)),
        reply_to:messages(*, sender:profiles(*))
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data as any) || [];
  },

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: MessageType;
    replyToId?: string | null;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content,
        message_type: params.messageType || 'text',
        reply_to_id: params.replyToId || null,
      })
      .select(`
        *,
        sender:profiles(*),
        attachments(*),
        reactions:message_reactions(*)
      `)
      .single();

    if (error) throw error;

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.conversationId);

    return data as any;
  },

  async editMessage(messageId: string, newContent: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  },

  async addReaction(messageId: string, userId: string, reaction: string): Promise<void> {
    const { error } = await supabase.from('message_reactions').upsert(
      {
        message_id: messageId,
        user_id: userId,
        reaction,
      },
      { onConflict: 'message_id,user_id,reaction' }
    );

    if (error) throw error;
  },

  async removeReaction(messageId: string, userId: string, reaction: string): Promise<void> {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('reaction', reaction);

    if (error) throw error;
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) console.warn('Mark as read warning:', error.message);
  },

  async togglePin(conversationId: string, userId: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('conversation_members')
      .update({ is_pinned: isPinned })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
