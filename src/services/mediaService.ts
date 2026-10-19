import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Attachment } from '../types';

export const mediaService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) throw new Error('Supabase is not configured');

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async uploadAttachment(messageId: string, conversationId: string, file: File): Promise<Attachment> {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured) throw new Error('Supabase is not configured');

    const fileExt = file.name.split('.').pop() || 'bin';
    const storagePath = `${conversationId}/${messageId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload to chat-attachments bucket
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(storagePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    // Get URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(storagePath);

    // Save attachment record in DB
    const { data, error: dbError } = await supabase
      .from('attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return {
      ...data,
      public_url: urlData.publicUrl,
    };
  },

  async uploadVoiceNote(conversationId: string, messageId: string, audioBlob: Blob): Promise<Attachment> {
    const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    return this.uploadAttachment(messageId, conversationId, file);
  },

  async getAttachmentUrl(storagePath: string): Promise<string> {
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(storagePath);
    return data.publicUrl;
  },
};
