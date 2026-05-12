'use client';
import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export interface DashboardMetricas {
  jogadasTotal: number;
  ganhadoresReais: number;
  naoFoi: number;
  entregues: number;
  pendentes: number;
  jogadasPorHora: { hora: string; total: number }[];
}

export function useDashboardMetricas(eventoId: string | null): {
  data: DashboardMetricas | null;
  loading: boolean;
  recarregar: () => void;
} {
  const [data, setData] = React.useState<DashboardMetricas | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    if (!eventoId) {
      setData(null); setLoading(false); return;
    }
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      setLoading(true);

      const { count: jogadasTotal } = await sb
        .from('sessoes_jogo')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventoId)
        .in('status', ['finalizada', 'pronta_para_girar', 'girando']);

      const { data: ganhadoresPremios } = await sb
        .from('ganhadores')
        .select('id, entregue, premios!inner(e_premio_real)')
        .eq('evento_id', eventoId);

      const arr = (ganhadoresPremios ?? []) as unknown as Array<{
        entregue: boolean;
        premios: { e_premio_real: boolean } | { e_premio_real: boolean }[];
      }>;
      const reais = arr.filter((g) => {
        const p = Array.isArray(g.premios) ? g.premios[0] : g.premios;
        return p?.e_premio_real;
      });
      const ganhadoresReais = reais.length;
      const naoFoi = arr.length - ganhadoresReais;
      const entregues = reais.filter((g) => g.entregue).length;
      const pendentes = ganhadoresReais - entregues;

      const hojeIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const { data: hojeRaw } = await sb
        .from('sessoes_jogo')
        .select('criada_em')
        .eq('evento_id', eventoId)
        .gte('criada_em', hojeIso);
      const buckets: Record<string, number> = {};
      (hojeRaw ?? []).forEach((s: { criada_em: string }) => {
        const h = new Date(s.criada_em).getHours();
        const key = `${String(h).padStart(2, '0')}h`;
        buckets[key] = (buckets[key] ?? 0) + 1;
      });
      const jogadasPorHora = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hora, total]) => ({ hora, total }));

      if (!alive) return;
      setData({
        jogadasTotal: jogadasTotal ?? 0,
        ganhadoresReais,
        naoFoi,
        entregues,
        pendentes,
        jogadasPorHora,
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [eventoId, nonce]);

  return { data, loading, recarregar: () => setNonce((n) => n + 1) };
}
