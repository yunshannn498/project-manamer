import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjBlYzkwYjU3ZDZlOTVmY2JkYTE5ODMyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNTI5NjAwLCJleHAiOjIwNDkxMDU2MDB9.JYRNO7fS6JNshL7x5-7FZsX-2YzZx_9F9T9cJ8qxGzI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    fetch: (url, options = {}) => {
      console.log(`[Supabase Request] ${options.method || 'GET'} ${url}`);
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        }
      }).then(res => {
        console.log(`[Supabase Response] ${res.status} ${res.statusText}`);
        return res;
      }).catch(err => {
        console.error('[Supabase Fetch Error]', err);
        throw err;
      });
    }
  },
  db: {
    schema: 'public'
  }
});
