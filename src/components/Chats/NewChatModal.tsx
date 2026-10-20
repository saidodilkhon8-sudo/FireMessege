import React, { useState } from 'react';
import { X, Search, UserPlus, Users, ArrowRight } from 'lucide-react';
import { Language, Profile } from '../../types';
import { getTranslation } from '../../i18n';
import { contactsService } from '../../services/contactsService';
import { chatService } from '../../services/chatService';
import { sound } from '../../utils/sound';
import { FULL_SUPABASE_SQL } from '../../lib/sqlMigration';

interface NewChatModalProps {
  currentUserId: string;
  lang: Language;
  onClose: () => void;
  onSelectConversation: (convId: string) => void;
  onOpenCreateGroup: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUserId,
  lang,
  onClose,
  onSelectConversation,
  onOpenCreateGroup,
}) => {
  const t = getTranslation(lang);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const results = await contactsService.searchUsers(query, currentUserId);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching contacts:', err);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    handleSearch('');
  }, []);

  const handleStartDirectChat = async (targetUserId: string) => {
    setIsCreating(true);
    try {
      const convId = await chatService.getOrCreateDirectConversation(currentUserId, targetUserId);
      sound.playClick();
      onSelectConversation(convId);
      onClose();
    } catch (err: any) {
      console.error('Error starting chat:', err);
      alert(err.message || 'Failed to start chat');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080808] border border-[#292929] shadow-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">{t.newChat}</h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group creation shortcut */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenCreateGroup();
          }}
          className="w-full mb-4 p-3 rounded-xl bg-[#111111] border border-[#292929] hover:border-white transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#181818] border border-[#292929] flex items-center justify-center text-white">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-white">{t.newGroup}</div>
              <div className="text-[11px] text-[#8A8A8A]">Групповой чат для нескольких участников</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A8A8A] group-hover:text-white transition group-hover:translate-x-1" />
        </button>

        {/* Search input with refresh */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по @username или имени..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between mb-2 px-1 text-[11px] text-[#8A8A8A]">
          <span>{searchQuery.trim() ? 'Результаты поиска' : 'Все пользователи'}</span>
          <button
            onClick={() => handleSearch(searchQuery)}
            className="hover:text-white transition font-mono"
          >
            Обновить ↻
          </button>
        </div>

        {/* Schema missing banner */}
        {contactsService.isSchemaMissing && (
          <div className="mb-3 p-3 rounded-xl bg-[#111111] border border-white/20 text-white space-y-2">
            <div className="text-xs font-bold text-white">⚠️ Таблицы базы данных не созданы в Supabase!</div>
            <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
              Выполните SQL-миграцию в Supabase SQL Editor для работы профилей и сообщений.
            </p>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                navigator.clipboard.writeText(FULL_SUPABASE_SQL);
                alert('✓ SQL-скрипт скопирован в буфер обмена!\n\nОткройте https://supabase.com -> ваш проект -> раздел SQL Editor -> вставьте код и нажмите RUN.');
              }}
              className="w-full py-1.5 rounded-lg bg-white text-black font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition"
            >
              📋 Скопировать SQL-скрипт
            </button>
          </div>
        )}

        {/* Search results list */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {isSearching && (
            <div className="py-8 text-center text-xs text-[#8A8A8A]">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Поиск пользователей...
            </div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <div className="py-8 text-center text-xs text-[#8A8A8A]">
              {searchQuery.trim()
                ? 'Пользователи с таким именем не найдены'
                : 'Другие пользователи пока не зарегистрированы в системе'}
            </div>
          )}

          {searchResults.map((user) => (
            <button
              key={user.id}
              disabled={isCreating}
              onClick={() => handleStartDirectChat(user.id)}
              className="w-full p-2.5 rounded-xl hover:bg-[#181818] transition flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#292929] overflow-hidden flex items-center justify-center shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white uppercase">
                      {user.full_name?.charAt(0) || user.username?.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:underline">
                    {user.full_name}
                  </div>
                  <div className="text-[11px] text-[#8A8A8A] font-mono">
                    @{user.username}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-white px-2.5 py-1 rounded-md bg-[#111111] border border-[#292929] group-hover:bg-white group-hover:text-black transition">
                Написать
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
