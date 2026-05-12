'use client';
import * as React from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { useAdmin } from '@/contexts/AdminContext';

/**
 * Retorna um SupabaseClient autenticado com o JWT-Admin (modo elevado).
 * Quando modo admin expira ou nunca foi ativado, retorna null.
 */
export function useAdminClient(): SupabaseClient | null {
  const { adminJwt, modoAdmin } = useAdmin();

  return React.useMemo(() => {
    if (!modoAdmin || !adminJwt) return null;
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${adminJwt}` } },
    });
  }, [adminJwt, modoAdmin]);
}
