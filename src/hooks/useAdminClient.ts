'use client';
import * as React from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { useAdmin } from '@/contexts/AdminContext';

// storageKey explicita e diferente do client default ('sb-<host>-auth-token').
// Sem isto, cada createClient com persistSession:false ainda inicializa um
// GoTrueClient que tenta sincronizar com a mesma chave do client principal —
// o que gera o warning 'Multiple GoTrueClient instances detected in the same
// browser context'.
const ADMIN_STORAGE_KEY = 'altisbet.admin.client';

/**
 * SupabaseClient autenticado com o JWT-Admin (modo elevado).
 * Retorna null quando o modo admin nao esta ativo.
 */
export function useAdminClient(): SupabaseClient | null {
  const { adminJwt, modoAdmin } = useAdmin();

  return React.useMemo(() => {
    if (!modoAdmin || !adminJwt) return null;
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: ADMIN_STORAGE_KEY,
      },
      global: { headers: { Authorization: `Bearer ${adminJwt}` } },
    });
  }, [adminJwt, modoAdmin]);
}
