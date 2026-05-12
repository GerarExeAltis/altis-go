import { createClient } from './deps.ts';
import type { SupabaseClient } from './deps.ts';

/**
 * Client com service_role — bypassa RLS. Usar apenas em Edge Functions
 * que validam autorização explicitamente antes.
 */
export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
