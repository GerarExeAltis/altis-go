import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL  = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function service(): SupabaseClient {
  return createClient(URL, SVC, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anon(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
