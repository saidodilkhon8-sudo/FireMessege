import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Pin, Ban, LogOut, Flame, X } from 'lucide-react';
import { Conversation, Message, Language, CallType } from '../../types';
import { getTranslation } from '../../i18n';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { chatService } from '../../services/chatService';
import { mediaService } from '../../services/mediaService';
import { sound } from '../../utils/sound';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUserId: string;
  lang: Language;
  isPeerTyping: boolean;
  onBackMobile: () => void;
  onSendTyping: () => void;
  onStartCall: (conversationId: string, targetUserId: string, callType: CallType) => void;
  onBlockUser?: (userId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  currentUserId,
  lang,
  isPeerTyping,
  onBackMobile,
  onSendTyping,
  onStartCall,
  onBlockUser,
}) => {
  const t = getTranslation(lang);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping]);

  if (!conversation) {
    return (
      <div className="flex-1 bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white mb-4 shadow-2xl">
          <Flame className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">FIREMESSAGE</h3>
        <p className="text-xs text-[#8A8A8A] max-w-xs leading-relaxed">
          Выберите диалог из списка слева или найдите пользователя по @username для начала переписки.
        </p>
      </div>
    );
  }

  const isDirect = conversation.type === 'direct';
  const otherUser = conversation.other_member;
  const chatTitle = isDirect ? otherUser?.full_name || 'Собеседник' : conversation.title || 'Group';
  const isOnline = isDirect && otherUser?.status === 'online';

  const isPinned = conversation.members?.some(
    (m) => m.user_id === currentUserId && m.is_pinned
  );

  const handleSendMessage = async (content: string, replyToId?: string | null) => {
    await chatService.sendMessage({
      conversationId: conversation.id,
      senderId: currentUserId,
      content,
      messageType: 'text',
      replyToId,
    });
  };

  const handleSendVoice = async (audioBlob: Blob) => {
    // 1. Create message record with type 'audio'
    const newMsg = await chatService.sendMessage({
      conversationId: conversation.id,
      senderId: currentUserId,
      content: '',
      messageType: 'audio',
    });

    // 2. Upload voice note to storage
    await mediaService.uploadVoiceNote(conversation.id, newMsg.id, audioBlob);
  };

  const handleSendAttachment = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const newMsg = await chatService.sendMessage({
      conversationId: conversation.id,
      senderId: currentUserId,
      content: '',
      messageType: isImage ? 'image' : 'file',
    });

    await mediaService.uploadAttachment(newMsg.id, conversation.id, file);
  };

  const handleEditSave = async (messageId: string, newContent: string) => {
    await chatService.editMessage(messageId, newContent);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await chatService.deleteMessage(messageId);
  };

  const handleReact = async (messageId: string, reaction: string) => {
    const msg = messages.find((m) => m.id === messageId);
    const alreadyReacted = msg?.reactions?.some(
      (r) => r.reaction === reaction && r.user_id === currentUserId
    );

    if (alreadyReacted) {
      await chatService.removeReaction(messageId, currentUserId, reaction);
    } else {
      await chatService.addReaction(messageId, currentUserId, reaction);
    }
  };

  const handleTogglePin = async () => {
    setShowMenu(false);
    await chatService.togglePin(conversation.id, currentUserId, !isPinned);
  };

  const handleLeaveGroup = async () => {
    setShowMenu(false);
    if (confirm('Вы уверены, что хотите покинуть эту группу?')) {
      await chatService.leaveConversation(conversation.id, currentUserId);
      onBackMobile();
    }
  };

  return (
    <div className="flex-1 bg-black flex flex-col h-full min-w-0 relative">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-[#292929] bg-[#080808]/90 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={() => {
              sound.playClick();
              onBackMobile();
            }}
            className="md:hidden p-2 rounded-xl bg-[#111111] border border-[#292929] text-white hover:border-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#292929] overflow-hidden flex items-center justify-center">
              {conversation.avatar_url || otherUser?.avatar_url ? (
                <img
                  src={conversation.avatar_url || otherUser?.avatar_url || ''}
                  alt={chatTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-white uppercase">
                  {chatTitle.charAt(0)}
                </span>
              )}
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-black" />
            )}
          </div>

          {/* Title & Status */}
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white truncate">
              {chatTitle}
            </div>
            <div className="text-[11px] font-mono text-[#8A8A8A] truncate">
              {isPeerTyping ? (
                <span className="text-white animate-pulse">
                  {otherUser?.full_name || 'Собеседник'} {t.typing}
                </span>
              ) : isDirect ? (
                isOnline ? (
                  <span className="text-[#D0D0D0]">{t.online}</span>
                ) : (
                  <span>{t.offline}</span>
                )
              ) : (
                <span>{conversation.members?.length || 1} участников</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons (WebRTC Call & Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isDirect && otherUser && (
            <>
              <button
                onClick={() => {
                  sound.playClick();
                  onStartCall(conversation.id, otherUser.id, 'audio');
                }}
                title={t.callAudio}
                className="p-2 sm:p-2.5 rounded-xl bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white hover:border-white transition"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onStartCall(conversation.id, otherUser.id, 'video');
                }}
                title={t.callVideo}
                className="p-2 sm:p-2.5 rounded-xl bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white hover:border-white transition"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-2 sm:p-2.5 rounded-xl bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white hover:border-white transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 z-30 w-48 rounded-2xl bg-[#080808] border border-[#292929] p-1.5 shadow-2xl space-y-0.5">
                <button
                  onClick={handleTogglePin}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs text-white hover:bg-[#181818] transition flex items-center gap-2"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{isPinned ? t.unpinChat : t.pinChat}</span>
                </button>

                {isDirect && otherUser && onBlockUser && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onBlockUser(otherUser.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-[#8A8A8A] hover:text-white hover:bg-[#181818] transition flex items-center gap-2"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{t.blockUser}</span>
                  </button>
                )}

                {!isDirect && (
                  <button
                    onClick={handleLeaveGroup}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-[#8A8A8A] hover:text-white hover:bg-[#181818] transition flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.leaveGroup}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages List Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8A8A8A]">
            <div className="w-10 h-10 rounded-full bg-[#111111] border border-[#292929] flex items-center justify-center text-white mb-2">
              ⚡
            </div>
            <div className="text-xs font-semibold text-white mb-1">
              Начало безопасной переписки
            </div>
            <div className="text-[11px] text-[#8A8A8A]">
              Сообщения защищены политиками Row Level Security
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              lang={lang}
              onReply={(m) => {
                setEditingMessage(null);
                setReplyTo(m);
              }}
              onEdit={(m) => {
                setReplyTo(null);
                setEditingMessage(m);
              }}
              onDelete={handleDeleteMessage}
              onReact={handleReact}
              onOpenImage={setPreviewImageUrl}
            />
          ))
        )}

        {/* Peer Typing Indicator in message flow */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A] px-3 py-2 rounded-xl bg-[#111111] w-fit border border-[#292929]">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
              style={{ animationDelay: '0.4s' }}
            />
            <span className="text-[11px] ml-1">{t.typing}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendVoice={handleSendVoice}
        onSendAttachment={handleSendAttachment}
        onSendTyping={onSendTyping}
        replyTo={replyTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        onSaveEdit={handleEditSave}
        lang={lang}
      />

      {/* Lightbox Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer"
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-[#111111] border border-[#292929] text-white hover:opacity-80"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImageUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-[#292929]"
          />
        </div>
      )}
    </div>
  );
};
