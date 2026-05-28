import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackSupabase = {
  from() {
    const chain = {
      select: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      insert: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      update: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      delete: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      upsert: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      eq() { return chain; },
      ilike() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      single: async () => ({ data: null, error: new Error('Supabase is not configured') }),
    };
    return chain;
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};

if (!hasSupabaseEnv) {
  console.warn('Supabase env vars are missing. Running in offline fallback mode.');
}

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (fallbackSupabase as unknown as ReturnType<typeof createClient>);
