'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { EventoDb, PremioDb, GanhadorDb } from '@/lib/admin/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Trophy, Heart, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  evento: EventoDb | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Metricas {
  jogadasTotal: number;
  ganhadoresReais: number;
  naoFoi: number;
  entregues: number;
  pendentes: number;
  premios: Array<{
    id: string;
    nome: string;
    e_premio_real: boolean;
    estoque_inicial: number;
    estoque_atual: number;
    sorteados: number;
  }>;
  ultimosGanhadores: Array<Pick<GanhadorDb, 'id' | 'jogador_nome' | 'jogador_telefone' | 'ganho_em' | 'entregue'> & { premio_nome: string }>;
}

export function HistoricoEventoModal({ evento, open, onOpenChange }: Props) {
  const adminClient = useAdminClient();
  const [metricas, setMetricas] = React.useState<Metricas | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !evento || !adminClient) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // Sessões finalizadas do evento
        const { count: jogadasTotal } = await adminClient
          .from('sessoes_jogo')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id)
          .eq('status', 'finalizada');

        // Prêmios do evento (com estoque consumido)
        const { data: premiosData } = await adminClient
          .from('premios')
          .select('id, nome, e_premio_real, estoque_inicial, estoque_atual')
          .eq('evento_id', evento.id)
          .order('ordem_roleta');
        const premios = (premiosData ?? []) as Array<Pick<PremioDb, 'id' | 'nome' | 'e_premio_real' | 'estoque_inicial' | 'estoque_atual'>>;

        // Ganhadores do evento (reais e não-foi)
        const { data: ganhadoresData } = await adminClient
          .from('ganhadores')
          .select('id, jogador_nome, jogador_telefone, ganho_em, entregue, premio_id, premios!inner(nome, e_premio_real)')
          .eq('evento_id', evento.id)
          .order('ganho_em', { ascending: false })
          .limit(200);
        type GanhadorJoin = Pick<GanhadorDb, 'id' | 'jogador_nome' | 'jogador_telefone' | 'ganho_em' | 'entregue' | 'premio_id'> & {
          premios: { nome: string; e_premio_real: boolean } | Array<{ nome: string; e_premio_real: boolean }>;
        };
        const ganhadores = (ganhadoresData ?? []) as unknown as GanhadorJoin[];
        const flatten = ganhadores.map((g) => {
          const p = Array.isArray(g.premios) ? g.premios[0] : g.premios;
          return {
            id: g.id,
            jogador_nome: g.jogador_nome,
            jogador_telefone: g.jogador_telefone,
            ganho_em: g.ganho_em,
            entregue: g.entregue,
            premio_nome: p?.nome ?? '',
            e_premio_real: !!p?.e_premio_real,
          };
        });

        const ganhadoresReais = flatten.filter((g) => g.e_premio_real).length;
        const naoFoi = flatten.filter((g) => !g.e_premio_real).length;
        const entregues = flatten.filter((g) => g.e_premio_real && g.entregue).length;
        const pendentes = ganhadoresReais - entregues;

        // Contagem real de sorteados por premio (fonte da verdade = tabela
        // ganhadores; estoque_inicial - estoque_atual pode dessincronizar
        // depois de edicao manual do estoque_inicial).
        const sorteadosPorPremio: Record<string, number> = {};
        for (const g of ganhadores) {
          sorteadosPorPremio[g.premio_id] = (sorteadosPorPremio[g.premio_id] ?? 0) + 1;
        }

        if (!alive) return;
        setMetricas({
          jogadasTotal: jogadasTotal ?? 0,
          ganhadoresReais,
          naoFoi,
          entregues,
          pendentes,
          premios: premios.map((p) => ({
            id: p.id,
            nome: p.nome,
            e_premio_real: p.e_premio_real,
            estoque_inicial: p.estoque_inicial,
            estoque_atual: p.estoque_atual,
            sorteados: sorteadosPorPremio[p.id] ?? 0,
          })),
          ultimosGanhadores: flatten
            .filter((g) => g.e_premio_real)
            .slice(0, 10)
            .map(({ id, jogador_nome, jogador_telefone, ganho_em, entregue, premio_nome }) => ({
              id, jogador_nome, jogador_telefone, ganho_em, entregue, premio_nome,
            })),
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, evento, adminClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento?.nome ?? 'Evento'}</DialogTitle>
          <DialogDescription>
            {evento ? `${evento.data_inicio} -> ${evento.data_fim}` : ''}
          </DialogDescription>
        </DialogHeader>

        {loading || !metricas ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando metricas...</p>
        ) : (
          <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniMetric titulo="Jogadas" valor={metricas.jogadasTotal} icone={Activity} />
              <MiniMetric titulo="Ganharam" valor={metricas.ganhadoresReais} icone={Trophy} />
              <MiniMetric titulo="Nao foi" valor={metricas.naoFoi} icone={Heart} />
              <MiniMetric
                titulo="Entregues/Pend."
                valor={`${metricas.entregues}/${metricas.pendentes}`}
                icone={Package}
              />
            </div>

            {/* Distribuição por prêmio */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">Distribuicao por premio</h3>
              <div className="space-y-2 rounded-md border border-border/60">
                {metricas.premios.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Sem premios cadastrados.</p>
                ) : (
                  metricas.premios.map((p) => {
                    const pct = p.estoque_inicial > 0
                      ? Math.round((p.sorteados / p.estoque_inicial) * 100)
                      : (p.sorteados > 0 ? 100 : 0);
                    return (
                      <div key={p.id} className="space-y-1 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="flex-1 font-medium">{p.nome}</span>
                          {!p.e_premio_real && <Badge variant="secondary">Slot vazio</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {p.sorteados} sorteado{p.sorteados !== 1 ? 's' : ''}
                            {p.estoque_inicial > 0 && ` / ${p.estoque_inicial}`}
                          </span>
                        </div>
                        {p.estoque_inicial > 0 && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Últimos ganhadores reais */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">Ultimos ganhadores</h3>
              {metricas.ultimosGanhadores.length === 0 ? (
                <p className="rounded-md border border-border/60 p-4 text-sm text-muted-foreground">
                  Ninguem ganhou um premio real ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                  {metricas.ultimosGanhadores.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="font-medium">{g.jogador_nome}</span>
                      <span className="font-mono text-xs text-muted-foreground">{g.jogador_telefone}</span>
                      <span className="flex-1 truncate text-muted-foreground">{g.premio_nome}</span>
                      <Badge variant={g.entregue ? 'success' : 'warning'}>
                        {g.entregue ? 'Entregue' : 'Pendente'}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {new Date(g.ganho_em).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MiniMetric({
  titulo, valor, icone: Icone,
}: { titulo: string; valor: number | string; icone: typeof Activity }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          'bg-primary/15 text-primary ring-1 ring-primary/30'
        )}>
          <Icone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{titulo}</p>
          <p className="text-lg font-bold leading-none">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}
