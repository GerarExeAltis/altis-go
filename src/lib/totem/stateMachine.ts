import type { SessaoStatus } from '@/lib/totem/types';

export type TotemState =
  | { tipo: 'attract' }
  | { tipo: 'criando_sessao' }
  | { tipo: 'aguardando_celular'; sessaoId: string; token: string; expiraEm: string }
  | { tipo: 'aguardando_dados'; sessaoId: string; token: string; expiraEm: string }
  | { tipo: 'pronta_para_girar'; sessaoId: string; premioId: string }
  | { tipo: 'girando'; sessaoId: string; premioId: string }
  | { tipo: 'finalizada'; sessaoId: string; premioId: string }
  | { tipo: 'erro'; mensagem: string };

export type TotemAction =
  | { tipo: 'TOCAR' }
  | { tipo: 'SESSAO_CRIADA'; sessaoId: string; token: string; expiraEm: string }
  | { tipo: 'REALTIME_STATUS'; status: SessaoStatus; premioId: string | null }
  | { tipo: 'ANIMACAO_TERMINOU' }
  | { tipo: 'AUTO_RETORNO' }
  | { tipo: 'ERRO_REDE'; mensagem: string }
  | { tipo: 'RESET' };

const INICIAL: TotemState = { tipo: 'attract' };

/**
 * Indica se este estado deve BLOQUEAR a saida do totem (exigir senha
 * admin pra voltar). True so a partir de `pronta_para_girar` — quando
 * o jogador efetivamente submeteu dados pelo celular e esta esperando
 * o jogo acontecer.
 *
 * Estados onde NAO bloqueia (operador pode voltar livremente):
 *   - attract:           totem parado esperando
 *   - criando_sessao:    limbo breve criando sessao
 *   - aguardando_celular: QR exposto mas sem comprometimento
 *   - aguardando_dados:  jogador escaneou mas ainda nao enviou dados
 *   - erro:              recuperacao
 *
 * A regra: voltar de QR ou de tela de espera de dados eh ok — apenas
 * cancela a sessao "vazia". Voltar de jogo em andamento eh que
 * precisa de senha (pra nao perder uma sessao com jogador investido).
 */
export function bloqueiaSaidaTotem(state: TotemState): boolean {
  return (
    state.tipo === 'pronta_para_girar' ||
    state.tipo === 'girando' ||
    state.tipo === 'finalizada'
  );
}

export function totemReducer(state: TotemState, action: TotemAction): TotemState {
  if (action.tipo === 'ERRO_REDE') return { tipo: 'erro', mensagem: action.mensagem };
  if (action.tipo === 'RESET') return INICIAL;

  if (action.tipo === 'REALTIME_STATUS') {
    if (action.status === 'expirada' || action.status === 'cancelada') {
      return INICIAL;
    }
  }

  switch (state.tipo) {
    case 'attract':
      if (action.tipo === 'TOCAR') return { tipo: 'criando_sessao' };
      return state;

    case 'criando_sessao':
      if (action.tipo === 'SESSAO_CRIADA') {
        return {
          tipo: 'aguardando_celular',
          sessaoId: action.sessaoId,
          token: action.token,
          expiraEm: action.expiraEm,
        };
      }
      return state;

    case 'aguardando_celular':
      if (action.tipo === 'REALTIME_STATUS' && action.status === 'aguardando_dados') {
        return {
          tipo: 'aguardando_dados',
          sessaoId: state.sessaoId,
          token: state.token,
          expiraEm: state.expiraEm,
        };
      }
      return state;

    case 'aguardando_dados':
      if (
        action.tipo === 'REALTIME_STATUS' &&
        action.status === 'pronta_para_girar' &&
        action.premioId
      ) {
        return { tipo: 'pronta_para_girar', sessaoId: state.sessaoId, premioId: action.premioId };
      }
      return state;

    case 'pronta_para_girar':
      if (action.tipo === 'REALTIME_STATUS' && action.status === 'girando') {
        return { tipo: 'girando', sessaoId: state.sessaoId, premioId: state.premioId };
      }
      return state;

    case 'girando':
      if (action.tipo === 'ANIMACAO_TERMINOU') {
        return { tipo: 'finalizada', sessaoId: state.sessaoId, premioId: state.premioId };
      }
      return state;

    case 'finalizada':
      if (action.tipo === 'AUTO_RETORNO') return INICIAL;
      return state;

    case 'erro':
      if (action.tipo === 'TOCAR') return INICIAL;
      return state;

    default:
      return state;
  }
}

export const ESTADO_INICIAL: TotemState = INICIAL;
