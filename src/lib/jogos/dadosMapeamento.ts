import type { PremioDb } from '@/lib/totem/types';

/**
 * Mapeamento de PREMIO -> PAR DE DADOS para o jogo "Dados da Sorte".
 *
 * REGRAS DE DESIGN:
 *   1. Cada premio precisa de um par UNICO (sem repeticao) — dois
 *      premios diferentes nao podem ganhar com a mesma combinacao.
 *   2. O mapeamento eh DETERMINISTICO: dado o mesmo premio (mesma
 *      ordem_roleta), retorna sempre o mesmo par. Sem isto, o
 *      carrossel exibiria "TIRE 3-5" mas os dados poderiam cair
 *      em "1-2" — descredito.
 *   3. A ORDEM dentro do par nao importa: (3,5) eh equivalente a
 *      (5,3). Trabalhamos sempre com pares NAO-ORDENADOS.
 *
 * COMBINACOES POSSIVEIS:
 *   2 dados d6 geram 21 pares nao-ordenados unicos:
 *     6 "dobradas"  (1-1, 2-2, ..., 6-6)
 *     15 mistas     (1-2, 1-3, ..., 5-6)
 *
 * ORDEM EMBARALHADA:
 *   A lista TODOS_PARES eh fixa mas em ordem aparentemente aleatoria
 *   — premios consecutivos (ordem_roleta 0, 1, 2...) ganham pares
 *   que NAO seguem padrao previsivel (ex: nao eh 1-1, 1-2, 1-3...).
 *   Isso evita a sensacao de "o prêmio 0 e sempre tirar 1" e da
 *   variedade visual ao carrossel.
 *
 *   O embaralhamento eh FIXO em codigo (nao em runtime) para
 *   garantir reprodutibilidade entre cliente e servidor — o carrossel
 *   sempre mostra a mesma associacao e os dados sempre caem do mesmo
 *   jeito para o mesmo premio.
 */
export const TODOS_PARES: ReadonlyArray<readonly [number, number]> = [
  // Dobradas vem primeiro (visualmente "premium") em ordem mista
  [6, 6], [3, 3], [5, 5], [2, 2], [4, 4], [1, 1],
  // Mistas com 6 (incluem o numero maximo, sensacao de "tire alto")
  [4, 6], [2, 6], [5, 6], [1, 6], [3, 6],
  // Mistas com 5
  [2, 5], [4, 5], [1, 5], [3, 5],
  // Mistas com 4
  [1, 4], [3, 4], [2, 4],
  // Mistas com 3
  [2, 3], [1, 3],
  // Mistas com 2
  [1, 2],
];

/**
 * Numero maximo de premios suportados com pares UNICOS.
 * Acima disso, o mapeamento cicla (modulo) — o carrossel mostra
 * pares repetidos. O preview admin deve avisar quando isto ocorre.
 */
export const MAX_PREMIOS_UNICOS = TODOS_PARES.length;

/**
 * Retorna o par de dados [d1, d2] que o premio aponta. Sempre
 * deterministico pela `ordem_roleta`.
 */
export function parDoPremio(premio: Pick<PremioDb, 'ordem_roleta'>): [number, number] {
  const idx = ((premio.ordem_roleta % MAX_PREMIOS_UNICOS) + MAX_PREMIOS_UNICOS) % MAX_PREMIOS_UNICOS;
  const par = TODOS_PARES[idx];
  return [par[0], par[1]];
}

/**
 * Util para legendas no UI — formata o par como "X + Y" (ou "X·X"
 * em dobradas, para enfatizar visualmente).
 */
export function legendaPar(par: [number, number]): string {
  if (par[0] === par[1]) return `Dupla ${par[0]}`;
  return `${par[0]} + ${par[1]}`;
}
