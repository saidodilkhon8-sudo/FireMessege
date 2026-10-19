import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getTranslation } from '../../i18n';
import { Language } from '../../types';

interface PWAInstallButtonProps {
  lang?: Language;
  variant?: 'nav' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'ru',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = getTranslation(lang);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111111] border border-[#292929]">
          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
            ✓
          </div>
          <div>
            <div className="text-xs font-semibold text-white">{t.installedPwa}</div>
            <div className="text-[11px] text-[#8A8A8A]">FireMessage Standalone App</div>
          </div>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Windows flow
  if (isInstallable) {
    if (variant === 'card') {
      return (
        <div className="p-4 rounded-xl bg-[#111111] border border-[#292929] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#292929] flex items-center justify-center text-white">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{t.installPwa}</div>
              <div className="text-xs text-[#8A8A8A]">Windows, Android, macOS</div>
            </div>
          </div>
          <button
            onClick={install}
            className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-semibold text-xs tracking-wider uppercase transition hover:opacity-90 active:scale-95"
          >
            {t.installPwa}
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        title={t.installPwa}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#292929] text-white hover:border-white transition text-xs font-medium"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t.installPwa}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#292929] text-white hover:border-white transition text-xs font-medium"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>iOS PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#111111] border border-[#292929] p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-bold text-lg mb-4 mx-auto">
                ⚡
              </div>
              <h3 className="text-base font-bold text-white text-center mb-2">
                Установка на iPhone / iPad
              </h3>
              <p className="text-xs text-[#8A8A8A] leading-relaxed mb-4 text-center">
                1. Нажмите кнопку <strong>«Поделиться» (Share)</strong> в нижней панели Safari.<br />
                2. Прокрутите вниз и выберите <strong>«На экран Домой» (Add to Home Screen)</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-lg bg-white text-black text-xs font-semibold hover:opacity-90"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
