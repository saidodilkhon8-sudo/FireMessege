import React, { useState } from 'react';
import { Settings as SettingsIcon, Volume2, Bell, Database, Check, AlertCircle, RefreshCw, Key, Shield, Radio } from 'lucide-react';
import { Language } from '../../types';
import { getTranslation } from '../../i18n';
import { getStoredSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { sound } from '../../utils/sound';
import { PWAInstallButton } from '../PWA/PWAInstallButton';

interface SettingsViewProps {
  lang: Language;
  onSelectLang: (lang: Language) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  onSelectLang,
}) => {
  const t = getTranslation(lang);
  const currentConfig = getStoredSupabaseConfig();

  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.anonKey);
  const [soundsEnabled, setSoundsEnabled] = useState(sound.getEnabled());
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  const handleToggleSound = () => {
    const next = !soundsEnabled;
    setSoundsEnabled(next);
    sound.setEnabled(next);
    if (next) sound.playClick();
  };

  const handleRequestNotifications = async () => {
    sound.playClick();
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('FireMessage', {
          body: 'Уведомления успешно активированы',
          icon: '/icon.svg',
        });
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setTestResult(res);
      if (res.success) sound.playMessageSent();
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSupabase = () => {
    sound.playClick();
    const ok = saveSupabaseConfig(supabaseUrl, supabaseKey);
    if (ok) {
      setSaveNotice(true);
      setTimeout(() => {
        setSaveNotice(false);
        window.location.reload();
      }, 800);
    }
  };

  const handleResetSupabase = () => {
    sound.playClick();
    if (confirm('Сбросить сохранённые ключи Supabase?')) {
      clearSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseKey('');
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 bg-black flex flex-col h-full overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#292929] pb-4">
        <h2 className="text-xl font-bold text-white tracking-wide">{t.settings}</h2>
        <p className="text-xs text-[#8A8A8A]">Параметры безопасности, базы данных и интерфейса</p>
      </div>

      {/* 1. Language Card */}
      <div className="p-5 rounded-2xl bg-[#080808] border border-[#292929] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{t.language}</h3>
            <p className="text-xs text-[#8A8A8A]">Выберите язык приложения</p>
          </div>
          <div className="flex rounded-xl bg-[#111111] border border-[#292929] p-1 text-xs font-mono">
            {(['ru', 'en', 'uz'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  sound.playClick();
                  onSelectLang(l);
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  lang === l
                    ? 'bg-white text-black font-bold'
                    : 'text-[#8A8A8A] hover:text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Sounds & Notifications Card */}
      <div className="p-5 rounded-2xl bg-[#080808] border border-[#292929] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t.sounds}</h3>
              <p className="text-xs text-[#8A8A8A]">Звуковые эффекты сообщений и звонков</p>
            </div>
          </div>
          <button
            onClick={handleToggleSound}
            className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
              soundsEnabled ? 'bg-white justify-end' : 'bg-[#292929] justify-start'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full transition ${
                soundsEnabled ? 'bg-black' : 'bg-[#8A8A8A]'
              }`}
            />
          </button>
        </div>

        <div className="border-t border-[#181818] pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t.notifications}</h3>
              <p className="text-xs text-[#8A8A8A]">
                Статус разрешения: <span className="font-mono text-white">{notifPermission}</span>
              </p>
            </div>
          </div>
          {notifPermission !== 'granted' && (
            <button
              onClick={handleRequestNotifications}
              className="px-3.5 py-1.5 rounded-xl bg-[#181818] border border-[#292929] text-xs font-semibold text-white hover:border-white transition"
            >
              Разрешить
            </button>
          )}
        </div>
      </div>

      {/* 3. Supabase Live Connection Card */}
      <div className="p-5 rounded-2xl bg-[#080808] border border-[#292929] space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t.supabaseConfig}</h3>
              <p className="text-xs text-[#8A8A8A]">
                PostgreSQL + Supabase Realtime & Auth
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono border ${
              currentConfig.isConfigured
                ? 'bg-white text-black border-white font-bold'
                : 'bg-[#181818] text-[#8A8A8A] border-[#292929]'
            }`}
          >
            {currentConfig.isConfigured ? t.connected : t.notConnected}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1">
              {t.supabaseUrl}
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white font-mono placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1">
              {t.supabaseAnonKey}
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white font-mono placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-[#111111] text-white border-white'
                  : 'bg-[#111111] text-[#D0D0D0] border-[#292929]'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-white shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs font-semibold text-white hover:border-white transition flex items-center gap-2 disabled:opacity-50"
            >
              {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Проверить соединение</span>
            </button>

            <button
              onClick={handleSaveSupabase}
              className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition shadow-sm"
            >
              {saveNotice ? 'Сохранено! Перезагрузка...' : t.applyCredentials}
            </button>

            <button
              onClick={handleResetSupabase}
              className="text-xs text-[#8A8A8A] hover:text-white transition ml-auto"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* 4. PWA Installation Section */}
      <PWAInstallButton lang={lang} variant="card" />

      {/* 5. Infrastructure & Security Information */}
      <div className="p-5 rounded-2xl bg-[#080808] border border-[#292929] space-y-2 text-xs text-[#8A8A8A]">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Radio className="w-4 h-4" />
          <span>Архитектура P2P WebRTC & STUN</span>
        </div>
        <p className="leading-relaxed">
          {t.webrtcNotice} Поддерживается прямое установление соединения между клиентами с адаптивной оптимизацией битрейта Opus и VP8/H.264.
        </p>
      </div>
    </div>
  );
};
