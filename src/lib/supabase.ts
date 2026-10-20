import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'fm_supabase_url';
const STORAGE_KEY_KEY = 'fm_supabase_key';

// In-memory fallback for SSR and test environments
const memoryStore = new Map<string, string>();

export function getStoredSupabaseConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const localUrl =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY_URL)
      : memoryStore.get(STORAGE_KEY_URL) || null;

  const localKey =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY_KEY)
      : memoryStore.get(STORAGE_KEY_KEY) || null;

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isConfigured = !!url && !url.includes('your-project-id') && !!anonKey && !anonKey.includes('your-anon-publishable-key');

  return { url, anonKey, isConfigured };
}

let activeClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const { url, anonKey, isConfigured } = getStoredSupabaseConfig();

  if (!isConfigured) {
    // Provide a dummy placeholder client to prevent crash before user enters credentials
    const dummyUrl = 'https://placeholder.supabase.co';
    const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
    if (!activeClient) {
      activeClient = createClient(dummyUrl, dummyKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
    return activeClient;
  }

  if (!activeClient) {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return activeClient;
}

export function saveSupabaseConfig(url: string, anonKey: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
      localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    } else {
      memoryStore.set(STORAGE_KEY_URL, url.trim());
      memoryStore.set(STORAGE_KEY_KEY, anonKey.trim());
    }
    activeClient = null; // force recreation on next getSupabase() call
    return true;
  } catch (err) {
    console.error('Failed to save Supabase config', err);
    return false;
  }
}

export function clearSupabaseConfig(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  } else {
    memoryStore.delete(STORAGE_KEY_URL);
    memoryStore.delete(STORAGE_KEY_KEY);
  }
  activeClient = null;
}


export async function testSupabaseConnection(testUrl?: string, testKey?: string): Promise<{ success: boolean; isSchemaMissing?: boolean; message: string }> {
  try {
    const config = getStoredSupabaseConfig();
    const url = testUrl || config.url;
    const anonKey = testKey || config.anonKey;

    if (!url || !anonKey || url.includes('your-project-id')) {
      return { success: false, message: 'URL and Anon Key must be provided' };
    }

    const testClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error } = await testClient.from('profiles').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('not find') || error.message?.includes('schema cache')) {
        return {
          success: false,
          isSchemaMissing: true,
          message: "Подключение к Supabase есть, но таблицы не созданы (таблица 'profiles' отсутствует). Нажмите «Скопировать SQL-скрипт» и выполните его в Supabase SQL Editor.",
        };
      }
      if (error.code !== 'PGRST116') {
        return { success: false, message: `Ошибка Supabase: ${error.message}` };
      }
    }

    return { success: true, isSchemaMissing: false, message: 'Успешно подключено к Supabase! Таблицы созданы и верифицированы.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Ошибка проверки соединения. Проверьте URL и ключ.' };
  }
}

export const supabase = getSupabase();
