import React, { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { Language } from '../../types';
import { getTranslation } from '../../i18n';
import { isValidEmail, isValidPassword, isValidUsername } from '../../lib/validation';
import { authService } from '../../services/authService';
import { getStoredSupabaseConfig } from '../../lib/supabase';
import { sound } from '../../utils/sound';

interface AuthModalProps {
  initialMode: 'signin' | 'signup';
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
  onOpenSettings: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  lang,
  onClose,
  onSuccess,
  onOpenSettings,
}) => {
  const t = getTranslation(lang);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { isConfigured } = getStoredSupabaseConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setErrorMsg('Supabase credentials are not configured. Click below to enter your Supabase URL & Anon Key.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    if (mode === 'forgot') {
      try {
        setIsLoading(true);
        await authService.resetPassword(email);
        setSuccessMsg('Password reset link sent to your email.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to send reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.error || 'Password must be at least 6 characters');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      const userCheck = isValidUsername(username);
      if (!userCheck.valid) {
        setErrorMsg(userCheck.error || 'Invalid username');
        return;
      }
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }

      try {
        setIsLoading(true);
        await authService.signUp(email, password, username, fullName);
        sound.playMessageSent();
        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Registration failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sign in
      try {
        setIsLoading(true);
        await authService.signIn(email, password);
        sound.playMessageSent();
        onSuccess();
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Invalid email or password');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080808] border border-[#292929] shadow-2xl p-6 sm:p-8 text-white my-8">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-lg bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white hover:border-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg">
            ⚡
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {mode === 'signup'
                ? t.signUp
                : mode === 'signin'
                ? t.signIn
                : t.resetPassword}
            </h2>
            <p className="text-xs text-[#8A8A8A]">FireMessage Monochrome Network</p>
          </div>
        </div>

        {/* Supabase Notice if not yet configured */}
        {!isConfigured && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#111111] border border-[#292929] flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-white mt-0.5 shrink-0" />
              <p className="text-xs text-[#D0D0D0] leading-relaxed">
                {t.notConnected}. {t.supabaseConfig}:
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="text-xs font-semibold text-white underline text-left hover:text-[#8A8A8A]"
            >
              → Настроить ключи Supabase в настройках
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-[#111111] border border-[#292929] flex items-center gap-2.5 text-xs text-white">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="mb-5 p-3 rounded-xl bg-[#111111] border border-[#292929] flex items-center gap-2.5 text-xs text-white">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-[#111111] border border-[#292929] p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                mode === 'signin'
                  ? 'bg-white text-black'
                  : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              {t.signIn}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                mode === 'signup'
                  ? 'bg-white text-black'
                  : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              {t.signUp}
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
                  {t.fullName}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-[#8A8A8A]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Александр Иванов"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
                  {t.username}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[#8A8A8A]">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alex_fire"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white font-mono transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
              {t.email}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-[#8A8A8A]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#8A8A8A]">
                  {t.password}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setMode('forgot');
                    }}
                    className="text-[11px] text-[#8A8A8A] hover:text-white transition"
                  >
                    {t.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#8A8A8A]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#8A8A8A]" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111111] border border-[#292929] text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider transition hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signup'
                    ? t.signUp
                    : mode === 'signin'
                    ? t.signIn
                    : t.resetPassword}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-xs text-[#8A8A8A] hover:text-white transition text-center mt-2"
            >
              ← Вернуться к входу
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
