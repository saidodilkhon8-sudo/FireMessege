export type Language = 'ru' | 'en' | 'uz';

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  status: UserStatus;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export type ConversationType = 'direct' | 'group';

export type MemberRole = 'owner' | 'admin' | 'member';

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_read_at: string;
  is_pinned: boolean;
  is_muted: boolean;
  profile?: Profile;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members?: ConversationMember[];
  last_message?: Message;
  unread_count?: number;
  other_member?: Profile; // For direct chats
}

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'call';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  profile?: Profile;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
  public_url?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  reply_to_id: string | null;
  reply_to?: Message;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sender?: Profile;
  attachments?: Attachment[];
  reactions?: MessageReaction[];
  is_sending?: boolean;
  is_error?: boolean;
}

export type CallStatus = 'ringing' | 'connected' | 'ended' | 'declined' | 'missed' | 'busy';
export type CallType = 'audio' | 'video';

export interface CallSession {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id?: string | null;
  status: CallStatus;
  call_type: CallType;
  sdp_offer?: RTCSessionDescriptionInit | null;
  sdp_answer?: RTCSessionDescriptionInit | null;
  created_at: string;
  ended_at?: string | null;
  caller?: Profile;
  receiver?: Profile;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_profile?: Profile;
}

export interface WebRTCSignalPayload {
  type: 'offer' | 'answer' | 'candidate' | 'call-ended' | 'call-declined';
  sender_id: string;
  target_id: string;
  session_id: string;
  data: any;
}
