'use client';
import * as React from 'react';
import { obterStatus, type StatusSessao } from '@/lib/jogar/edgeFunctions';

/**
 * Polling de status da sessao para o celular (anon).
 *
 * Por que polling em vez de Realtime: a tabela sessoes_jogo tem RLS
 * que so libera SELECT para `authenticated` (operador do totem). O
 * Supabase Realtime postgres_changes aplica RLS — entao anon nunca
 * recebe os eventos. Polling via Edge Function `obter-status` (que
 * usa service_role apos validar o JWT da sessao) e PII-safe: retorna
 * apenas status e premio_sorteado_id, sem nome/telefone/email.
 *
 * Intervalo padrao 1500ms — rapido o suficiente para UX boa, leve
 * para o backend. Para mais agressivo em telas criticas, ajuste via
 * prop intervaloMs.
 */
export function usePollingStatus(
  sessaoId: string | null,
  token: string | null,
  intervaloMs = 1500,
): {
  status: StatusSessao | null;
  erro: Error | null;
} {
  const [status, setStatus] = React.useState<StatusSessao | null>(null);
  const [erro, setErro] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!sessaoId || !token) {
      setStatus(null);
      setErro(null);
      return;
    }

    let alive = true;
    let timeoutId: number | null = null;

    const tick = async () => {
      try {
        const novo = await obterStatus(sessaoId, token);
        if (!alive) return;
        setStatus(novo);
        setErro(null);
      } catch (e) {
        if (!alive) return;
        setErro(e as Error);
      } finally {
        if (alive) {
          timeoutId = window.setTimeout(tick, intervaloMs);
        }
      }
    };

    tick();

    return () => {
      alive = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [sessaoId, token, intervaloMs]);

  return { status, erro };
}
