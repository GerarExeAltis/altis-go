'use client';
import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { SessaoStatus } from '@/lib/totem/types';

export interface RealtimePayload {
  status: SessaoStatus;
  premio_sorteado_id: string | null;
}

/**
 * Assina mudanças em sessoes_jogo para uma sessão específica.
 * Retorna o último payload conhecido + estado de conexão.
 */
export function useSessaoRealtime(sessaoId: string | null): {
  payload: RealtimePayload | null;
  conectado: boolean;
} {
  const [payload, setPayload] = React.useState<RealtimePayload | null>(null);
  const [conectado, setConectado] = React.useState(false);

  React.useEffect(() => {
    if (!sessaoId) {
      setPayload(null);
      setConectado(false);
      return;
    }

    const sb = getSupabaseBrowserClient();

    let alive = true;
    sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id')
      .eq('id', sessaoId)
      .single()
      .then(({ data }) => {
        if (alive && data) {
          setPayload({
            status: data.status as SessaoStatus,
            premio_sorteado_id: data.premio_sorteado_id ?? null,
          });
        }
      });

    const channel = sb
      .channel(`sessao:${sessaoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessoes_jogo', filter: `id=eq.${sessaoId}` },
        (rec) => {
          const novo = rec.new as { status: SessaoStatus; premio_sorteado_id: string | null };
          setPayload({ status: novo.status, premio_sorteado_id: novo.premio_sorteado_id });
        }
      )
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED');
      });

    return () => {
      alive = false;
      sb.removeChannel(channel);
    };
  }, [sessaoId]);

  return { payload, conectado };
}
