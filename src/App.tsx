import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRealtimeChat } from './hooks/useRealtimeChat';
import { Language, CallType, Profile } from './types';
import { defaultLanguage } from './i18n';
import { LandingPage } from './components/Landing/LandingPage';
import { AuthModal } from './components/Auth/AuthModal';
import { SidebarNav, NavTab } from './components/Navigation/SidebarNav';
import { ChatList } from './components/Chats/ChatList';
import { ChatArea } from './components/Messages/ChatArea';
import { ContactsView } from './components/Contacts/ContactsView';
import { SettingsView } from './components/Settings/SettingsView';
import { NewChatModal } from './components/Chats/NewChatModal';
import { CreateGroupModal } from './components/Chats/CreateGroupModal';
import { ProfileModal } from './components/Profile/ProfileModal';
import { CallModal } from './components/Calls/CallModal';
import { OfflineIndicator } from './components/PWA/OfflineIndicator';
import { contactsService } from './services/contactsService';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fm_lang') as Language;
      if (stored === 'ru' || stored === 'en' || stored === 'uz') return stored;
    }
    return defaultLanguage;
  });

  const handleSelectLang = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fm_lang', newLang);
    }
  };

  // Auth Hook
  const {
    user,
    profile,
    isLoading: isAuthLoading,
    signOut,
    updateProfile,
    refreshProfile,
  } = useAuth();

  // Navigation & Active View State
  const [activeTab, setActiveTab] = useState<NavTab>('chats');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Modals
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Call State
  const [callModal, setCallModal] = useState<{
    isOpen: boolean;
    isIncoming: boolean;
    conversationId: string;
    targetUser: Profile | null;
    callType: CallType;
    incomingSignalData?: any;
  }>({
    isOpen: false,
    isIncoming: false,
    conversationId: '',
    targetUser: null,
    callType: 'audio',
  });

  // Realtime Chat Hook
  const {
    messages,
    conversations,
    isPeerTyping,
    sendTypingIndicator,
    loadConversations,
    incomingCallData,
    clearIncomingCall,
    broadcastIncomingCall,
  } = useRealtimeChat(user?.id, activeConversationId || undefined);

  // Listen to incoming calls
  useEffect(() => {
    if (incomingCallData && user?.id) {
      setCallModal({
        isOpen: true,
        isIncoming: true,
        conversationId: incomingCallData.conversationId,
        targetUser: incomingCallData.callerProfile || null,
        callType: incomingCallData.callType || 'audio',
        incomingSignalData: incomingCallData,
      });
    }
  }, [incomingCallData, user?.id]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Total unread messages across conversations
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const handleStartCall = (convId: string, targetUserId: string, callType: CallType) => {
    const targetProf = activeConversation?.other_member || null;

    // Broadcast call alert to peer
    broadcastIncomingCall({
      conversationId: convId,
      targetUserId,
      callerId: user?.id,
      callerProfile: profile,
      callType,
    });

    setCallModal({
      isOpen: true,
      isIncoming: false,
      conversationId: convId,
      targetUser: targetProf,
      callType,
    });
  };

  const handleBlockUserFromChat = async (targetUserId: string) => {
    if (user?.id) {
      await contactsService.blockUser(user.id, targetUserId);
      alert('Пользователь заблокирован');
      loadConversations();
    }
  };

  // If initial loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-xl mb-4 animate-pulse">
          ⚡
        </div>
        <div className="text-xs font-mono tracking-widest text-[#8A8A8A] uppercase">
          FireMessage Initializing...
        </div>
      </div>
    );
  }

  // If not logged in, render Landing Page with option to open Auth Modal
  if (!user) {
    return (
      <>
        <LandingPage
          lang={lang}
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          onSelectLang={handleSelectLang}
        />

        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            lang={lang}
            onClose={() => setAuthModalMode(null)}
            onSuccess={() => {
              setAuthModalMode(null);
              refreshProfile();
            }}
            onOpenSettings={() => {
              setAuthModalMode(null);
            }}
          />
        )}

        <OfflineIndicator lang={lang} />
      </>
    );
  }

  // Main Authenticated Messenger Layout
  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col md:flex-row overflow-hidden select-none">
      {/* 1. Left Vertical Navigation Sidebar (or bottom bar on mobile) */}
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chats') {
            setActiveConversationId(null);
          }
        }}
        lang={lang}
        profile={profile}
        unreadCount={totalUnread}
        onOpenProfile={() => setShowProfileModal(true)}
        onSignOut={signOut}
      />

      {/* 2. Middle & Main Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'chats' && (
          <>
            {/* Conversation List (Hidden on mobile when chat is active) */}
            <div
              className={`w-full md:w-80 lg:w-96 h-full flex flex-col ${
                activeConversationId ? 'hidden md:flex' : 'flex'
              }`}
            >
              <ChatList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => setActiveConversationId(id)}
                onOpenNewChat={() => setShowNewChatModal(true)}
                lang={lang}
                currentUserId={user.id}
              />
            </div>

            {/* Conversation Chat Area (Hidden on mobile when no chat is active) */}
            <div
              className={`flex-1 h-full flex flex-col ${
                !activeConversationId ? 'hidden md:flex' : 'flex'
              }`}
            >
              <ChatArea
                conversation={activeConversation}
                messages={messages}
                currentUserId={user.id}
                lang={lang}
                isPeerTyping={isPeerTyping}
                onBackMobile={() => setActiveConversationId(null)}
                onSendTyping={sendTypingIndicator}
                onStartCall={handleStartCall}
                onBlockUser={handleBlockUserFromChat}
              />
            </div>
          </>
        )}

        {activeTab === 'contacts' && (
          <ContactsView
            currentUserId={user.id}
            lang={lang}
            onSelectConversation={(convId) => {
              setActiveConversationId(convId);
              setActiveTab('chats');
            }}
          />
        )}

        {activeTab === 'groups' && (
          <div className="flex-1 bg-black flex flex-col h-full overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6 border-b border-[#292929] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Группы</h2>
                <p className="text-xs text-[#8A8A8A]">Управление групповыми диалогами</p>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition shadow-sm"
              >
                + Создать группу
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {conversations
                .filter((c) => c.type === 'group')
                .map((group) => (
                  <div
                    key={group.id}
                    onClick={() => {
                      setActiveConversationId(group.id);
                      setActiveTab('chats');
                    }}
                    className="p-4 rounded-2xl bg-[#080808] border border-[#292929] hover:border-white/40 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#181818] border border-[#292929] flex items-center justify-center font-bold text-sm text-white">
                        {group.title?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{group.title}</div>
                        <div className="text-xs text-[#8A8A8A]">
                          {group.members?.length || 1} участников
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-white px-3 py-1.5 rounded-lg bg-[#111111] border border-[#292929]">
                      Открыть
                    </span>
                  </div>
                ))}

              {conversations.filter((c) => c.type === 'group').length === 0 && (
                <div className="col-span-full py-16 text-center text-xs text-[#8A8A8A]">
                  Вы пока не состоите ни в одной группе. Нажмите «Создать группу» для запуска новой команды.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsView lang={lang} onSelectLang={handleSelectLang} />
        )}
      </main>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          currentUserId={user.id}
          lang={lang}
          onClose={() => setShowNewChatModal(false)}
          onSelectConversation={(convId) => {
            setActiveConversationId(convId);
            setActiveTab('chats');
          }}
          onOpenCreateGroup={() => {
            setShowNewChatModal(false);
            setShowCreateGroupModal(true);
          }}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          currentUserId={user.id}
          lang={lang}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={(convId) => {
            setActiveConversationId(convId);
            setActiveTab('chats');
            loadConversations();
          }}
        />
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
          lang={lang}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={updateProfile}
        />
      )}

      {/* WebRTC Video & Audio Call Modal */}
      {callModal.isOpen && (
        <CallModal
          isOpen={callModal.isOpen}
          isIncoming={callModal.isIncoming}
          conversationId={callModal.conversationId}
          currentUserId={user.id}
          targetUser={callModal.targetUser}
          callType={callModal.callType}
          incomingSignalData={callModal.incomingSignalData}
          lang={lang}
          onClose={() => {
            clearIncomingCall();
            setCallModal({
              isOpen: false,
              isIncoming: false,
              conversationId: '',
              targetUser: null,
              callType: 'audio',
            });
          }}
        />
      )}

      {/* Global PWA Offline Warning Banner */}
      <OfflineIndicator lang={lang} />
    </div>
  );
}
