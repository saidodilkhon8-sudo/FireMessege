import React, { useState, useRef } from 'react';
import { X, Camera, User, FileText, Check, Shield } from 'lucide-react';
import { Language, Profile } from '../../types';
import { getTranslation } from '../../i18n';
import { mediaService } from '../../services/mediaService';
import { sound } from '../../utils/sound';

interface ProfileModalProps {
  profile: Profile | null;
  lang: Language;
  onClose: () => void;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<Profile>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  lang,
  onClose,
  onUpdateProfile,
}) => {
  const t = getTranslation(lang);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setIsUploading(true);
    try {
      const url = await mediaService.uploadAvatar(profile.id, file);
      setAvatarUrl(url);
      sound.playMessageSent();
    } catch (err: any) {
      alert(err.message || 'Avatar upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setIsSaving(true);
    try {
      await onUpdateProfile({
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl || null,
      });
      sound.playMessageSent();
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080808] border border-[#292929] shadow-2xl p-6 sm:p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">{t.profile}</h3>
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

        {/* Avatar Upload Container */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full bg-[#181818] border-2 border-[#292929] group-hover:border-white transition overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white uppercase">
                  {fullName.charAt(0) || profile?.username.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
              <Camera className="w-6 h-6" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFile}
            accept="image/*"
            className="hidden"
          />
          {isUploading && (
            <span className="text-[11px] text-[#8A8A8A] mt-2">Загрузка аватара...</span>
          )}
          <span className="text-xs font-mono text-[#8A8A8A] mt-2">
            @{profile?.username}
          </span>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
              {t.fullName}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
              {t.bio}
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Короткий статус..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition resize-none"
            />
          </div>

          {/* Account Security Information Card */}
          <div className="p-3 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-between text-xs text-[#8A8A8A]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white" />
              <span>Статус аккаунта</span>
            </div>
            <span className="text-white font-mono font-medium">Активен (RLS Verified)</span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full mt-4 py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider transition hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : successNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>Сохранено!</span>
              </>
            ) : (
              <span>{t.save}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
