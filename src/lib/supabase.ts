import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjBlYzkwYjU3ZDZlOTVmY2JkYTE5ODMyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNTI5NjAwLCJleHAiOjIwNDkxMDU2MDB9.JYRNO7fS6JNshL7x5-7FZsX-2YzZx_9F9T9cJ8qxGzI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Config] ❌ Missing environment variables');
  throw new Error('Supabase configuration is missing. Please check your .env file.');
}

console.log('[Supabase Config] ✓ Environment variables loaded');
console.log('[Supabase Config] URL:', supabaseUrl);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  },
  db: {
    schema: 'public'
  }
});

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('[Connection Test] Starting database connection test...');
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[Connection Test] ❌ Database error:', error.message);
      return false;
    }

    console.log('[Connection Test] ✓ Database connection successful');
    return true;
  } catch (err) {
    console.error('[Connection Test] ❌ Connection failed:', err);
    return false;
  }
}
