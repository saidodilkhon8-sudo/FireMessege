import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  validateAttachment,
  sanitizeText,
  formatTime,
  formatDuration,
  formatBytes,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '../lib/validation';
import { getStoredSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from '../lib/supabase';
import { sound } from '../utils/sound';

describe('FireMessage — Form & Security Validation', () => {
  it('validates email addresses correctly', () => {
    expect(isValidEmail('user@firemessage.io')).toBe(true);
    expect(isValidEmail('alex.dev+test@corp.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('validates unique username rules (3-30 chars, alphanumeric + underscore)', () => {
    expect(isValidUsername('alex_2026').valid).toBe(true);
    expect(isValidUsername('cyber_wolf').valid).toBe(true);
    expect(isValidUsername('a').valid).toBe(false); // too short
    expect(isValidUsername('user!invalid#').valid).toBe(false); // forbidden special characters
    expect(isValidUsername('a'.repeat(31)).valid).toBe(false); // too long
  });

  it('validates password security requirements', () => {
    expect(isValidPassword('secure123').valid).toBe(true);
    expect(isValidPassword('short').valid).toBe(false);
    expect(isValidPassword('').valid).toBe(false);
  });

  it('sanitizes dangerous HTML/XSS input', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeText(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('enforces 50MB file size limits on chat attachments', () => {
    const validFile = new File(['small content'], 'doc.pdf', { type: 'application/pdf' });
    expect(validateAttachment(validFile).valid).toBe(true);

    const oversizedBlob = new Blob([new Uint8Array(MAX_ATTACHMENT_SIZE_BYTES + 1024)]);
    const oversizedFile = new File([oversizedBlob], 'huge.zip', { type: 'application/zip' });
    expect(validateAttachment(oversizedFile).valid).toBe(false);
  });
});

describe('FireMessage — Utilities & Formatting', () => {
  it('formats call & voice duration cleanly', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('formats file sizes accurately', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5 MB');
  });

  it('formats valid timestamp hours and minutes', () => {
    const date = new Date('2026-10-19T14:30:00Z').toISOString();
    const formatted = formatTime(date);
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe('FireMessage — Supabase Configuration Store', () => {
  beforeEach(() => {
    clearSupabaseConfig();
  });

  it('correctly persists and clears user Supabase credentials', () => {
    const testUrl = 'https://custom-project.supabase.co';
    const testKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.testkey';

    saveSupabaseConfig(testUrl, testKey);
    const retrieved = getStoredSupabaseConfig();
    expect(retrieved.url).toBe(testUrl);
    expect(retrieved.anonKey).toBe(testKey);
    expect(retrieved.isConfigured).toBe(true);

    clearSupabaseConfig();
    const cleared = getStoredSupabaseConfig();
    const defaultEnvUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    expect(cleared.url).toBe(defaultEnvUrl.trim());
  });
});

describe('FireMessage — Sound Controller', () => {
  it('toggles sound effects enabled state', () => {
    sound.setEnabled(false);
    expect(sound.getEnabled()).toBe(false);
    sound.setEnabled(true);
    expect(sound.getEnabled()).toBe(true);
  });
});
