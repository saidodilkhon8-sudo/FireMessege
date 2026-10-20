import React, { useState } from 'react';
import { X, Users, Search, Check, ArrowRight } from 'lucide-react';
import { Language, Profile } from '../../types';
import { getTranslation } from '../../i18n';
import { contactsService } from '../../services/contactsService';
import { chatService } from '../../services/chatService';
import { sound } from '../../utils/sound';

interface CreateGroupModalProps {
  currentUserId: string;
  lang: Language;
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  currentUserId,
  lang,
  onClose,
  onGroupCreated,
}) => {
  const t = getTranslation(lang);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    try {
      const results = await contactsService.searchUsers(query, currentUserId);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    handleSearch('');
  }, []);

  const toggleSelectUser = (user: Profile) => {
    sound.playClick();
    if (selectedUserIds.includes(user.id)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelectedUserIds((prev) => [...prev, user.id]);
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Введите название группы');
      return;
    }

    setIsSubmitting(true);
    try {
      const convId = await chatService.createGroupConversation(
        currentUserId,
        title.trim(),
        description.trim(),
        selectedUserIds
      );
      sound.playMessageSent();
      onGroupCreated(convId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка создания группы');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080808] border border-[#292929] shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">{t.newGroup}</h3>
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

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
              {t.groupName}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="FireMessage Developers..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
              {t.groupDesc}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Цель и описание группы..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition resize-none"
            />
          </div>

          {/* Selected participants preview */}
          {selectedUsers.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-[#8A8A8A] mb-2">
                Выбрано участников: {selectedUsers.length}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181818] border border-[#292929] text-[11px] text-white"
                  >
                    <span>{u.full_name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectUser(u)}
                      className="text-[#8A8A8A] hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search participants */}
          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
              Добавить участников ({t.search})
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8A8A8A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Поиск по @username..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1">
              {searchResults.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleSelectUser(user)}
                    className={`p-2 rounded-xl cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#111111] hover:bg-[#181818] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#292929] flex items-center justify-center text-[10px] font-bold">
                        {user.full_name?.charAt(0)}
                      </div>
                      <div className="text-xs">{user.full_name} (@{user.username})</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-black" />}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider transition hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t.newGroup}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
