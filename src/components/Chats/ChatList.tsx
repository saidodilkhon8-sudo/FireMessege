import React, { useState } from 'react';
import { Search, Plus, Pin, Mic, FileText, Image as ImageIcon, Flame } from 'lucide-react';
import { Conversation, Language } from '../../types';
import { getTranslation } from '../../i18n';
import { formatRelativeDate } from '../../lib/validation';
import { sound } from '../../utils/sound';

interface ChatListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChat: () => void;
  lang: Language;
  currentUserId: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  lang,
  currentUserId,
}) => {
  const t = getTranslation(lang);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'pinned'>('all');

  const filteredConversations = conversations.filter((c) => {
    // 1. Filter by tab
    if (filterTab === 'direct' && c.type !== 'direct') return false;
    if (filterTab === 'group' && c.type !== 'group') return false;
    const isPinned = c.members?.some((m) => m.user_id === currentUserId && m.is_pinned);
    if (filterTab === 'pinned' && !isPinned) return false;

    // 2. Filter by search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    if (c.type === 'direct') {
      const other = c.other_member;
      return (
        other?.full_name?.toLowerCase().includes(q) ||
        other?.username?.toLowerCase().includes(q)
      );
    } else {
      return (
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
  });

  const getChatTitle = (c: Conversation) => {
    if (c.type === 'direct') {
      return c.other_member?.full_name || 'FireMessage User';
    }
    return c.title || 'Group Chat';
  };

  const getChatSubtitle = (c: Conversation) => {
    if (c.type === 'direct' && c.other_member?.username) {
      return `@${c.other_member.username}`;
    }
    return `${c.members?.length || 1} ${t.members.toLowerCase()}`;
  };

  const getLastMessagePreview = (c: Conversation) => {
    const lastMsg = c.last_message;
    if (!lastMsg) return 'Нет сообщений';

    if (lastMsg.message_type === 'audio') {
      return (
        <span className="flex items-center gap-1 text-[#D0D0D0]">
          <Mic className="w-3 h-3" />
          <span>{t.recordVoice}</span>
        </span>
      );
    }
    if (lastMsg.message_type === 'image') {
      return (
        <span className="flex items-center gap-1 text-[#D0D0D0]">
          <ImageIcon className="w-3 h-3" />
          <span>Фотография</span>
        </span>
      );
    }
    if (lastMsg.message_type === 'file') {
      return (
        <span className="flex items-center gap-1 text-[#D0D0D0]">
          <FileText className="w-3 h-3" />
          <span>Вложение</span>
        </span>
      );
    }

    return lastMsg.content;
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-[#080808] border-r border-[#292929] flex flex-col h-full shrink-0">
      {/* Top Header */}
      <div className="p-4 border-b border-[#292929] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">{t.chats}</h2>
          <p className="text-[11px] text-[#8A8A8A] font-mono">
            {conversations.length} активных диалогов
          </p>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            onOpenNewChat();
          }}
          title={t.newChat}
          className="p-2 rounded-xl bg-white text-black hover:opacity-90 active:scale-95 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-[#292929]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center px-3 py-2 border-b border-[#292929] gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => {
            sound.playClick();
            setFilterTab('all');
          }}
          className={`px-3 py-1 rounded-lg transition shrink-0 ${
            filterTab === 'all'
              ? 'bg-white text-black font-semibold'
              : 'text-[#8A8A8A] hover:text-white'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setFilterTab('direct');
          }}
          className={`px-3 py-1 rounded-lg transition shrink-0 ${
            filterTab === 'direct'
              ? 'bg-white text-black font-semibold'
              : 'text-[#8A8A8A] hover:text-white'
          }`}
        >
          Личные
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setFilterTab('group');
          }}
          className={`px-3 py-1 rounded-lg transition shrink-0 ${
            filterTab === 'group'
              ? 'bg-white text-black font-semibold'
              : 'text-[#8A8A8A] hover:text-white'
          }`}
        >
          Группы
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setFilterTab('pinned');
          }}
          className={`px-3 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
            filterTab === 'pinned'
              ? 'bg-white text-black font-semibold'
              : 'text-[#8A8A8A] hover:text-white'
          }`}
        >
          <Pin className="w-3 h-3" />
          <span>{t.pinned}</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#181818]">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white mb-3">
              <Flame className="w-5 h-5 text-[#8A8A8A]" />
            </div>
            <div className="text-sm font-semibold text-white mb-1">{t.noChats}</div>
            <div className="text-xs text-[#8A8A8A] max-w-[220px] mb-4">
              {t.startChatHint}
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onOpenNewChat();
              }}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:opacity-90 transition shadow-sm"
            >
              {t.newChat}
            </button>
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isActive = c.id === activeConversationId;
            const isPinned = c.members?.some((m) => m.user_id === currentUserId && m.is_pinned);
            const isOnline = c.type === 'direct' && c.other_member?.status === 'online';

            return (
              <button
                key={c.id}
                onClick={() => {
                  sound.playClick();
                  onSelectConversation(c.id);
                }}
                className={`w-full p-3.5 flex items-start gap-3 text-left transition group ${
                  isActive
                    ? 'bg-[#181818] border-l-2 border-white'
                    : 'hover:bg-[#111111]'
                }`}
              >
                {/* Avatar with Status Dot */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-[#181818] border border-[#292929] overflow-hidden flex items-center justify-center">
                    {c.avatar_url || c.other_member?.avatar_url ? (
                      <img
                        src={c.avatar_url || c.other_member?.avatar_url || ''}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white uppercase">
                        {getChatTitle(c).charAt(0)}
                      </span>
                    )}
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-white ring-2 ring-black" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[160px]">
                      {getChatTitle(c)}
                    </span>
                    {c.last_message?.created_at && (
                      <span className="text-[10px] text-[#8A8A8A] font-mono shrink-0">
                        {formatRelativeDate(c.last_message.created_at, lang)}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[#8A8A8A] mb-1 truncate">
                    {getChatSubtitle(c)}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[#8A8A8A] truncate max-w-[180px] group-hover:text-[#D0D0D0] transition">
                      {getLastMessagePreview(c)}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPinned && <Pin className="w-3 h-3 text-white fill-white" />}
                      {!!c.unread_count && c.unread_count > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
