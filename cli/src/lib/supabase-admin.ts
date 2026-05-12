import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from './env.js';

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase com service_role — bypassa RLS. Para uso EXCLUSIVO da CLI.
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Útil em testes que rodam dentro do mesmo processo. */
export function resetAdminClient(): void {
  cached = null;
}
