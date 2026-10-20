import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://wcjmgmllutvejudsenxn.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Testing Supabase URL:', url);
console.log('Key length:', key.length);

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Profiles error:', error);
  console.log('Profiles count:', data ? data.length : 0);
  console.log('Profiles data:', JSON.stringify(data, null, 2));

  // Also test auth users count or RPC if available
}

run();
