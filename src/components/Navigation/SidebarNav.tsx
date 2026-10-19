import React from 'react';
import { MessageSquare, Users, UserCheck, Settings, LogOut, Flame } from 'lucide-react';
import { Language, Profile } from '../../types';
import { getTranslation } from '../../i18n';
import { sound } from '../../utils/sound';

export type NavTab = 'chats' | 'contacts' | 'groups' | 'settings';

interface SidebarNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: Language;
  profile: Profile | null;
  unreadCount?: number;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  lang,
  profile,
  unreadCount = 0,
  onOpenProfile,
  onSignOut,
}) => {
  const t = getTranslation(lang);

  const navItems = [
    { id: 'chats' as NavTab, label: t.chats, icon: MessageSquare, badge: unreadCount },
    { id: 'contacts' as NavTab, label: t.contacts, icon: UserCheck },
    { id: 'groups' as NavTab, label: t.groups, icon: Users },
    { id: 'settings' as NavTab, label: t.settings, icon: Settings },
  ];

  return (
    <aside className="w-full md:w-20 md:min-w-[80px] bg-[#080808] border-t md:border-t-0 md:border-r border-[#292929] flex md:flex-col items-center justify-between p-3 md:py-6 z-30 shrink-0">
      {/* Brand Icon (Desktop) */}
      <div className="hidden md:flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.25)] transition hover:scale-105 cursor-pointer">
          <Flame className="w-6 h-6 fill-black stroke-black" />
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex md:flex-col items-center justify-around md:justify-center w-full md:w-auto gap-1 md:gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                sound.playClick();
                onSelectTab(item.id);
              }}
              title={item.label}
              className={`relative p-3 rounded-2xl transition flex items-center justify-center ${
                isActive
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'text-[#8A8A8A] hover:text-white hover:bg-[#181818]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {!!item.badge && item.badge > 0 && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-black text-white' : 'bg-white text-black'
                  }`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Avatar & Logout */}
      <div className="hidden md:flex flex-col items-center gap-3">
        <button
          onClick={() => {
            sound.playClick();
            onOpenProfile();
          }}
          title={t.profile}
          className="relative w-11 h-11 rounded-full bg-[#181818] border border-[#292929] hover:border-white transition overflow-hidden flex items-center justify-center group"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-white uppercase">
              {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
            </span>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-black" />
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onSignOut();
          }}
          title={t.signOut}
          className="p-2 rounded-xl text-[#8A8A8A] hover:text-white hover:bg-[#181818] transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
