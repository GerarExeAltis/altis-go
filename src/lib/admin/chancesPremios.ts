import type { PremioDb } from '@/lib/admin/types';

export interface ChancePremio {
  premio: PremioDb;
  peso_efetivo: number;
  chance: number; // 0-1
  elegivel: boolean; // entrou no pool do sorteio
}

/**
 * Calcula peso efetivo e chance percentual de cada premio, replicando
 * EXATAMENTE a logica de sortear_e_baixar_estoque (Postgres):
 *
 *   peso_efetivo =
 *     peso_base                  se NAO e premio real ("Nao foi dessa vez")
 *     peso_base * estoque_atual  se E premio real
 *
 *   elegivel = peso_base > 0 AND (estoque_atual > 0 OR !e_premio_real)
 *
 *   chance = peso_efetivo / SUM(peso_efetivo dos elegiveis)
 *
 * Premios nao elegiveis aparecem no retorno com chance=0 e elegivel=false
 * — uteis para o admin entender por que um item nao esta sendo sorteado.
 */
export function calcularChances(premios: PremioDb[]): ChancePremio[] {
  const itens = premios.map((p) => {
    const elegivel = p.peso_base > 0 && (p.estoque_atual > 0 || !p.e_premio_real);
    const peso_efetivo = !elegivel
      ? 0
      : p.e_premio_real
        ? p.peso_base * p.estoque_atual
        : p.peso_base;
    return { premio: p, peso_efetivo, elegivel };
  });

  const total = itens.reduce((acc, x) => acc + x.peso_efetivo, 0);

  return itens.map((x) => ({
    ...x,
    chance: total > 0 ? x.peso_efetivo / total : 0,
  }));
}

export function formatPercent(v: number, casas = 2): string {
  return (v * 100).toFixed(casas).replace('.', ',') + '%';
}
