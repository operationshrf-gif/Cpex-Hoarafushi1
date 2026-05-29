import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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

if (!isSupabaseConfigured) {
  console.warn('Supabase env vars missing — using browser storage fallback.');
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (fallbackSupabase as unknown as SupabaseClient);
