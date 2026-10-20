import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://wcjmgmllutvejudsenxn.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  const tables = ['profiles', 'conversations', 'conversation_members', 'messages'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table ${t}:`, error ? error.message : 'OK');
  }
}

check();
