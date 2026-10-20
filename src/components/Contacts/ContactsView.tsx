import React, { useState, useEffect } from 'react';
import { Search, UserCheck, MessageSquare, ShieldAlert, Ban, Check, User } from 'lucide-react';
import { Language, Profile, UserBlock } from '../../types';
import { getTranslation } from '../../i18n';
import { contactsService } from '../../services/contactsService';
import { chatService } from '../../services/chatService';
import { sound } from '../../utils/sound';
import { FULL_SUPABASE_SQL } from '../../lib/sqlMigration';

interface ContactsViewProps {
  currentUserId: string;
  lang: Language;
  onSelectConversation: (convId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  currentUserId,
  lang,
  onSelectConversation,
}) => {
  const t = getTranslation(lang);
  const [activeTab, setActiveTab] = useState<'search' | 'blocked'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBlocked = async () => {
    try {
      const list = await contactsService.getBlockedUsers(currentUserId);
      setBlockedUsers(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const res = await contactsService.searchUsers(query, currentUserId);
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'blocked') {
      loadBlocked();
    } else {
      handleSearch(searchQuery);
    }
  }, [activeTab]);

  const handleStartChat = async (targetUserId: string) => {
    setActionLoading(targetUserId);
    try {
      const convId = await chatService.getOrCreateDirectConversation(currentUserId, targetUserId);
      sound.playClick();
      onSelectConversation(convId);
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    sound.playClick();
    try {
      await contactsService.blockUser(currentUserId, targetUserId);
      loadBlocked();
      setSearchResults((prev) => prev.filter((u) => u.id !== targetUserId));
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    sound.playClick();
    try {
      await contactsService.unblockUser(currentUserId, targetUserId);
      setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== targetUserId));
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    }
  };

  return (
    <div className="flex-1 bg-black flex flex-col h-full overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-[#292929] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">{t.contacts}</h2>
          <p className="text-xs text-[#8A8A8A]">Поиск пользователей и управление приватностью</p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-[#111111] border border-[#292929] p-1 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('search');
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'search'
                ? 'bg-white text-black font-semibold'
                : 'text-[#8A8A8A] hover:text-white'
            }`}
          >
            Поиск пользователей
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('blocked');
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'blocked'
                ? 'bg-white text-black font-semibold'
                : 'text-[#8A8A8A] hover:text-white'
            }`}
          >
            {t.blockedUsers}
          </button>
        </div>
      </div>

      {activeTab === 'search' ? (
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#8A8A8A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Поиск по @username или имени..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
              autoFocus
            />
          </div>

          {/* Header row with counter and refresh */}
          <div className="flex items-center justify-between px-1 text-xs text-[#8A8A8A]">
            <span>
              {searchQuery.trim()
                ? `Найдено: ${searchResults.length}`
                : `Все пользователи (${searchResults.length})`}
            </span>
            <button
              onClick={() => handleSearch(searchQuery)}
              className="hover:text-white transition font-mono text-[11px]"
            >
              Обновить список ↻
            </button>
          </div>

          {/* Schema Migration Notice Banner */}
          {contactsService.isSchemaMissing && (
            <div className="p-4 rounded-2xl bg-[#111111] border border-white/20 text-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span>⚠️ Таблицы базы данных ещё не созданы в Supabase!</span>
              </div>
              <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
                Таблица <code className="text-white bg-[#181818] px-1 py-0.5 rounded">public.profiles</code> отсутствует в проекте. Скопируйте готовый SQL-скрипт ниже, откройте <strong>Supabase → SQL Editor</strong>, вставьте и нажмите <strong>RUN</strong>. После этого нажмите «Обновить список ↻».
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  navigator.clipboard.writeText(FULL_SUPABASE_SQL);
                  alert('✓ SQL-скрипт скопирован в буфер обмена!\n\nОткройте https://supabase.com -> ваш проект -> раздел SQL Editor -> вставьте код и нажмите RUN.');
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <span>📋 Скопировать SQL-скрипт для Supabase</span>
              </button>
            </div>
          )}

          {/* User Results Grid */}
          <div className="space-y-3 mt-1">
            {isSearching && (
              <div className="py-12 text-center text-xs text-[#8A8A8A]">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Поиск в базе данных...
              </div>
            )}

            {!isSearching && searchResults.length === 0 && (
              <div className="py-12 text-center text-xs text-[#8A8A8A] flex flex-col items-center">
                <User className="w-8 h-8 text-[#292929] mb-3" />
                <span className="mb-2">
                  {searchQuery.trim()
                    ? 'Пользователи с таким именем не найдены'
                    : 'Другие пользователи пока не найдены'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    navigator.clipboard.writeText(FULL_SUPABASE_SQL);
                    alert('✓ SQL-скрипт скопирован в буфер обмена!\n\nОткройте https://supabase.com -> ваш проект -> раздел SQL Editor -> вставьте код и нажмите RUN.');
                  }}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#292929] text-xs text-[#D0D0D0] hover:text-white hover:border-white transition"
                >
                  📋 Скопировать SQL-скрипт для Supabase
                </button>
              </div>
            )}

            {searchResults.map((user) => (
              <div
                key={user.id}
                className="p-4 rounded-2xl bg-[#080808] border border-[#292929] hover:border-white/30 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[#181818] border border-[#292929] overflow-hidden flex items-center justify-center shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white uppercase">
                        {user.full_name?.charAt(0) || user.username?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{user.full_name}</div>
                    <div className="text-xs text-[#8A8A8A] font-mono">@{user.username}</div>
                    {user.bio && (
                      <div className="text-[11px] text-[#8A8A8A] truncate max-w-sm mt-0.5">
                        {user.bio}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleStartChat(user.id)}
                    disabled={actionLoading === user.id}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-black" />
                    <span>Написать</span>
                  </button>

                  <button
                    onClick={() => handleBlockUser(user.id)}
                    title={t.blockUser}
                    className="p-2 rounded-xl bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white transition"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Blocked Users View */
        <div className="space-y-3">
          {blockedUsers.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#8A8A8A] flex flex-col items-center">
              <ShieldAlert className="w-8 h-8 text-[#292929] mb-3" />
              <span>{t.noBlockedUsers}</span>
            </div>
          ) : (
            blockedUsers.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl bg-[#080808] border border-[#292929] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#292929] flex items-center justify-center font-bold text-xs uppercase">
                    {b.blocked_profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {b.blocked_profile?.full_name || 'Пользователь'}
                    </div>
                    <div className="text-xs text-[#8A8A8A] font-mono">
                      @{b.blocked_profile?.username || 'user'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblockUser(b.blocked_id)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#181818] border border-[#292929] text-xs font-semibold text-white hover:border-white transition"
                >
                  {t.unblockUser}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
