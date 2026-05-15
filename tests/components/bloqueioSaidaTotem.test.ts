import { describe, it, expect } from 'vitest';
import { bloqueiaSaidaTotem, type TotemState } from '@/lib/totem/stateMachine';

// Valida a regra centralizada: bloqueio ativa SO apos pronta_para_girar.
// QR Code e attract devem ficar livres pra operador voltar sem senha.

describe('bloqueiaSaidaTotem', () => {
  const casos: Array<{ state: TotemState; deveBloquear: boolean }> = [
    { state: { tipo: 'attract' }, deveBloquear: false },
    { state: { tipo: 'criando_sessao' }, deveBloquear: false },
    {
      state: { tipo: 'aguardando_celular', sessaoId: 's', token: 't', expiraEm: '2099-01-01' },
      deveBloquear: false,
    },
    {
      state: { tipo: 'aguardando_dados', sessaoId: 's', token: 't', expiraEm: '2099-01-01' },
      deveBloquear: false,
    },
    {
      state: { tipo: 'pronta_para_girar', sessaoId: 's', premioId: 'p' },
      deveBloquear: true,
    },
    { state: { tipo: 'girando', sessaoId: 's', premioId: 'p' }, deveBloquear: true },
    { state: { tipo: 'finalizada', sessaoId: 's', premioId: 'p' }, deveBloquear: true },
    { state: { tipo: 'erro', mensagem: 'qualquer' }, deveBloquear: false },
  ];

  for (const { state, deveBloquear } of casos) {
    it(`${state.tipo} -> bloqueia=${deveBloquear}`, () => {
      expect(bloqueiaSaidaTotem(state)).toBe(deveBloquear);
    });
  }
});
