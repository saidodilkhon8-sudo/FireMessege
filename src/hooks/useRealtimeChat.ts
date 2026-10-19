import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getStoredSupabaseConfig } from '../lib/supabase';
import { Message, Conversation } from '../types';
import { chatService } from '../services/chatService';
import { sound } from '../utils/sound';

export function useRealtimeChat(currentUserId?: string, activeConversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const typingChannelRef = useRef<any>(null);
  const callChannelRef = useRef<any>(null);

  // 1. Fetch conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const convs = await chatService.fetchConversations(currentUserId);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !currentUserId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    chatService
      .fetchMessages(activeConversationId)
      .then((msgs) => {
        if (isMounted) {
          setMessages(msgs);
          setIsLoadingMessages(false);
          // Mark as read
          chatService.markAsRead(activeConversationId, currentUserId);
        }
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConversationId, currentUserId]);

  // 3. Realtime subscription for Messages & Conversations
  useEffect(() => {
    const { isConfigured } = getStoredSupabaseConfig();
    if (!isConfigured || !currentUserId) return;

    // Listen to messages table changes
    const msgChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as any;
          const oldMsg = payload.old as any;

          // If message is in currently active chat
          if (newMsg?.conversation_id === activeConversationId) {
            if (payload.eventType === 'INSERT') {
              // Fetch sender details
              const { data: sender } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', newMsg.sender_id)
                .single();

              const fullMessage: Message = {
                ...newMsg,
                sender: sender || undefined,
                reactions: [],
                attachments: [],
              };

              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, fullMessage];
              });

              if (newMsg.sender_id !== currentUserId) {
                sound.playMessageReceived();
                if (activeConversationId) {
                  chatService.markAsRead(activeConversationId, currentUserId);
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              if (newMsg.deleted_at) {
                setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
              } else {
                setMessages((prev) =>
                  prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m))
                );
              }
            } else if (payload.eventType === 'DELETE') {
              setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
            }
          }

          // Refresh conversation list to update last_message and unread badges
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          // Re-fetch messages or update reactions
          if (activeConversationId) {
            chatService.fetchMessages(activeConversationId).then(setMessages);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [currentUserId, activeConversationId, loadConversations]);

  // 4. Typing indicator Broadcast Channel
  useEffect(() => {
    if (!activeConversationId || !currentUserId) return;

    const channel = supabase.channel(`typing_${activeConversationId}`);
    typingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId && payload.userId !== currentUserId) {
          setIsPeerTyping(true);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = window.setTimeout(() => {
            setIsPeerTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeConversationId, currentUserId]);

  // 5. Incoming Call Listener Channel
  useEffect(() => {
    if (!currentUserId) return;

    const callChannel = supabase.channel(`user_calls_${currentUserId}`);
    callChannelRef.current = callChannel;

    callChannel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        if (payload && payload.targetUserId === currentUserId) {
          sound.startRingtone();
          setIncomingCallData(payload);
        }
      })
      .on('broadcast', { event: 'call_cancelled' }, () => {
        sound.stopRingtone();
        setIncomingCallData(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
      callChannelRef.current = null;
    };
  }, [currentUserId]);

  const sendTypingIndicator = useCallback(() => {
    if (typingChannelRef.current && currentUserId) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId },
      });
    }
  }, [currentUserId]);

  const broadcastIncomingCall = useCallback((payload: any) => {
    if (callChannelRef.current) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload,
      });
    }
  }, []);

  const clearIncomingCall = useCallback(() => {
    sound.stopRingtone();
    setIncomingCallData(null);
  }, []);

  return {
    messages,
    setMessages,
    conversations,
    isLoadingMessages,
    isPeerTyping,
    sendTypingIndicator,
    loadConversations,
    incomingCallData,
    clearIncomingCall,
    broadcastIncomingCall,
  };
}
