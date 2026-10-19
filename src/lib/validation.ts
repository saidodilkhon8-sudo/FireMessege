/**
 * Validation & Security Utilities for FireMessage
 */

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidUsername(username: string): { valid: boolean; error?: string } {
  if (!username) return { valid: false, error: 'Username is required' };
  const clean = username.trim();
  if (clean.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (clean.length > 30) return { valid: false, error: 'Username must be at most 30 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  return { valid: true };
}

export function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
}

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function validateAttachment(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }
  return { valid: true };
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatRelativeDate(isoString: string, lang: 'ru' | 'en' | 'uz' = 'ru'): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return formatTime(isoString);
    } else if (diffDays === 1) {
      return lang === 'ru' ? 'Вчера' : lang === 'uz' ? 'Kecha' : 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US', { day: 'numeric', month: 'short' });
    }
  } catch {
    return '';
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
