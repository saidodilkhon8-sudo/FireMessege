import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getTranslation } from '../../i18n';
import { Language } from '../../types';

interface OfflineIndicatorProps {
  lang?: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang = 'ru' }) => {
  const isOnline = useOnlineStatus();
  const t = getTranslation(lang);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-white shadow-2xl animate-mono-pulse">
      <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
      <WifiOff className="w-4 h-4 text-[#8A8A8A]" />
      <span className="text-xs font-medium tracking-wide">{t.offlineBanner}</span>
    </div>
  );
};
