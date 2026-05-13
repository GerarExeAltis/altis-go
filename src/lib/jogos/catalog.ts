import type { JogoDef, JogoId } from './types';
import { ROLETA_DEF } from './roleta';
import { DADOS_DEF } from './dados';

/**
 * Catálogo central de jogos. Para adicionar um novo jogo:
 *  1. Criar src/lib/jogos/<id>.tsx exportando uma JogoDef
 *  2. Adicionar 'id' no type JogoId (src/lib/jogos/types.ts) se for novo
 *  3. Adicionar a definição abaixo
 *  4. Pronto — Welcome page e PreviewJogoModal já picam automaticamente
 */
export const JOGOS: JogoDef[] = [
  ROLETA_DEF,
  DADOS_DEF,
];

export function getJogo(id: JogoId): JogoDef | null {
  return JOGOS.find((j) => j.id === id) ?? null;
}

export function jogosAtivos(): JogoDef[] {
  return JOGOS.filter((j) => j.status === 'ativo');
}

export function jogosComPreview(): JogoDef[] {
  return JOGOS.filter((j) => j.Preview !== null);
}
