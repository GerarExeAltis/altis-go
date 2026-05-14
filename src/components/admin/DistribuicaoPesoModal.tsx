'use client';
import * as React from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { PremioDb } from '@/lib/admin/types';
import { calcularChances, formatPercent } from '@/lib/admin/chancesPremios';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  premios: PremioDb[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Modal com grafico de barras horizontais da distribuicao de peso
 * + tabela detalhada com a chance de cada item e a formula matematica.
 */
export function DistribuicaoPesoModal({ premios, open, onOpenChange }: Props) {
  const [verCalculo, setVerCalculo] = React.useState(false);

  const chances = calcularChances(premios);
  const ordenado = [...chances].sort((a, b) => {
    if (a.elegivel !== b.elegivel) return a.elegivel ? -1 : 1;
    return b.chance - a.chance;
  });
  const maxChance = ordenado[0]?.chance ?? 0;
  const totalEfetivo = chances.reduce((acc, c) => acc + c.peso_efetivo, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl p-0">
        <header className="border-b border-border/60 px-6 py-4 pr-12">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5 text-primary" />
            Distribuição de peso
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Probabilidade relativa de cada prêmio (maior → menor).
          </p>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {chances.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Nenhum prêmio cadastrado.
            </p>
          ) : (
            <ul className="space-y-3">
              {ordenado.map(({ premio, peso_efetivo, chance, elegivel }) => {
                const larguraPct = maxChance > 0 ? (chance / maxChance) * 100 : 0;
                const cor = !elegivel
                  ? 'bg-muted'
                  : premio.e_premio_real
                    ? 'bg-primary'
                    : 'bg-muted-foreground/40';
                return (
                  <li key={premio.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className={`font-medium ${!elegivel ? 'text-muted-foreground line-through' : ''}`}>
                        {premio.nome}
                        {!premio.e_premio_real && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (slot vazio)
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {elegivel ? (
                          <>
                            <span className="font-semibold text-foreground">{formatPercent(chance)}</span>
                            <span className="ml-2 text-xs">
                              peso {peso_efetivo} {premio.e_premio_real && `(${premio.peso_base} × ${premio.estoque_atual})`}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs italic">não elegível</span>
                        )}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cor}`}
                        style={{ width: `${larguraPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <span className="inline-block h-2 w-3 rounded-full bg-primary align-middle" /> prêmios reais
              <span className="mx-3 inline-block h-2 w-3 rounded-full bg-muted-foreground/40 align-middle" /> &quot;não foi dessa vez&quot;
              <span className="mx-3 inline-block h-2 w-3 rounded-full bg-muted align-middle" /> não elegíveis
            </div>
            <button
              type="button"
              onClick={() => setVerCalculo((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              {verCalculo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {verCalculo ? 'Ocultar cálculo' : 'Ver cálculo detalhado'}
            </button>
          </div>

          {verCalculo && (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Ord.</th>
                      <th className="px-3 py-2 text-left">Prêmio</th>
                      <th className="px-3 py-2 text-right">Peso</th>
                      <th className="px-3 py-2 text-right">Estoque</th>
                      <th className="px-3 py-2 text-center">Real</th>
                      <th className="px-3 py-2 text-right">Peso efet.</th>
                      <th className="px-3 py-2 text-right">Chance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chances.map(({ premio, peso_efetivo, chance, elegivel }) => (
                      <tr
                        key={premio.id}
                        className={`border-t border-border/40 ${!elegivel ? 'opacity-50' : ''}`}
                      >
                        <td className="px-3 py-2 text-left text-muted-foreground">{premio.ordem_roleta}</td>
                        <td className="px-3 py-2 text-left font-medium">{premio.nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{premio.peso_base}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{premio.estoque_atual}</td>
                        <td className="px-3 py-2 text-center">{premio.e_premio_real ? 't' : 'f'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{peso_efetivo}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-semibold tabular-nums ${elegivel ? 'text-primary' : 'text-muted-foreground'}`}>
                            {formatPercent(chance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={5}>Total</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totalEfetivo}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">100,00%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
                <h3 className="mb-2 font-semibold">Fórmula do sorteio</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <strong>Peso efetivo</strong>:
                    <ul className="ml-4 mt-1 list-disc space-y-1">
                      <li>Prêmio real → <code className="rounded bg-muted px-1 text-xs">peso × estoque</code></li>
                      <li>&quot;Não foi dessa vez&quot; → <code className="rounded bg-muted px-1 text-xs">peso</code></li>
                    </ul>
                  </li>
                  <li>
                    <strong>Elegibilidade</strong>:{' '}
                    <code className="rounded bg-muted px-1 text-xs">peso &gt; 0 AND (estoque &gt; 0 OR slot vazio)</code>
                  </li>
                  <li>
                    <strong>Chance</strong>:{' '}
                    <code className="rounded bg-muted px-1 text-xs">peso_efetivo ÷ soma dos pesos efetivos</code>
                  </li>
                </ul>
                <p className="mt-3 text-xs">
                  Mesma lógica de <code className="rounded bg-muted px-1 text-xs">sortear_e_baixar_estoque</code> no banco.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
