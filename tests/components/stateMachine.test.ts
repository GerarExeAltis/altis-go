import { describe, it, expect } from 'vitest';
import { totemReducer, type TotemState } from '@/lib/totem/stateMachine';

const inicial: TotemState = { tipo: 'attract' };

describe('totemReducer', () => {
  it('attract + TOCAR -> criando_sessao', () => {
    const next = totemReducer(inicial, { tipo: 'TOCAR' });
    expect(next.tipo).toBe('criando_sessao');
  });

  it('criando_sessao + SESSAO_CRIADA -> aguardando_celular', () => {
    const next = totemReducer(
      { tipo: 'criando_sessao' },
      {
        tipo: 'SESSAO_CRIADA',
        sessaoId: 's-1', token: 't',
        expiraEm: new Date(Date.now() + 300_000).toISOString(),
      }
    );
    expect(next).toMatchObject({ tipo: 'aguardando_celular', sessaoId: 's-1', token: 't' });
  });

  it('aguardando_celular + REALTIME aguardando_dados -> aguardando_dados', () => {
    const next = totemReducer(
      { tipo: 'aguardando_celular', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'REALTIME_STATUS', status: 'aguardando_dados', premioId: null }
    );
    expect(next.tipo).toBe('aguardando_dados');
  });

  it('aguardando_dados + REALTIME pronta_para_girar -> pronta_para_girar com premioId', () => {
    const next = totemReducer(
      { tipo: 'aguardando_dados', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'REALTIME_STATUS', status: 'pronta_para_girar', premioId: 'p-1' }
    );
    expect(next).toMatchObject({ tipo: 'pronta_para_girar', premioId: 'p-1' });
  });

  it('girando + ANIMACAO_TERMINOU -> finalizada', () => {
    const next = totemReducer(
      { tipo: 'girando', sessaoId: 's-1', premioId: 'p-1' },
      { tipo: 'ANIMACAO_TERMINOU' }
    );
    expect(next.tipo).toBe('finalizada');
  });

  it('finalizada + AUTO_RETORNO -> attract (limpa estado)', () => {
    const next = totemReducer(
      { tipo: 'finalizada', sessaoId: 's-1', premioId: 'p-1' },
      { tipo: 'AUTO_RETORNO' }
    );
    expect(next).toEqual({ tipo: 'attract' });
  });

  it('qualquer estado + REALTIME expirada -> attract (sessao perdida)', () => {
    const next = totemReducer(
      { tipo: 'aguardando_dados', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'REALTIME_STATUS', status: 'expirada', premioId: null }
    );
    expect(next).toEqual({ tipo: 'attract' });
  });

  it('ERRO_REDE em qualquer estado -> erro com mensagem', () => {
    const next = totemReducer(
      { tipo: 'aguardando_celular', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'ERRO_REDE', mensagem: 'sem conexao' }
    );
    expect(next).toEqual({ tipo: 'erro', mensagem: 'sem conexao' });
  });
});
