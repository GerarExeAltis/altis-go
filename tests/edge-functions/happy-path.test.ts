import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';

const sb = service();
const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_DEMO = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
const TELEFONE_E2E = '54988880099';

let opTok: string;

beforeAll(async () => { opTok = await operadorJwt(OPERADOR_ID); });

afterAll(async () => {
  // limpar ganhador + sessao do happy path
  await sb.from('ganhadores').delete()
    .eq('evento_id', EVENTO_DEMO).eq('jogador_telefone', TELEFONE_E2E);
  await sb.from('sessoes_jogo').delete()
    .eq('evento_id', EVENTO_DEMO).eq('jogador_telefone', TELEFONE_E2E);
});

describe('happy-path E2E', () => {
  it('liberar -> obter -> submeter -> iniciar -> concluir', async () => {
    // 1) liberar
    const r1 = await callFn<any>(
      'liberar-jogada',
      { jogo: 'roleta' },
      { Authorization: `Bearer ${opTok}` }
    );
    expect(r1.status).toBe(200);
    const { sessao_id, token } = r1.body;

    // 2) obter
    const r2 = await callFn<any>('obter-sessao', { s: sessao_id, t: token });
    expect(r2.status).toBe(200);
    expect(r2.body.premios.length).toBeGreaterThan(0);

    // 3) submeter
    const r3 = await callFn<any>('submeter-dados', {
      s: sessao_id,
      t: token,
      dados: {
        nome: 'E2E Tester',
        telefone: TELEFONE_E2E,
        email: 'e2e@tester.local',
        loja_id: null,
      },
      fingerprint: '0e2e'.repeat(8),
    });
    expect(r3.status).toBe(200);

    // 4) iniciar
    const r4 = await callFn('iniciar-animacao',
      { sessao_id }, { Authorization: `Bearer ${opTok}` });
    expect(r4.status).toBe(200);

    // 5) concluir
    const r5 = await callFn('concluir-animacao',
      { sessao_id }, { Authorization: `Bearer ${opTok}` });
    expect(r5.status).toBe(200);

    // Estado final
    const { data: final } = await sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id, finalizada_em')
      .eq('id', sessao_id).single();
    expect(final?.status).toBe('finalizada');
    expect(final?.premio_sorteado_id).toBeTruthy();
    expect(final?.finalizada_em).toBeTruthy();

    // Ganhador registrado
    const { data: ganh } = await sb.from('ganhadores')
      .select('jogador_nome, premio_id').eq('sessao_id', sessao_id).single();
    expect(ganh?.jogador_nome).toBe('E2E Tester');
  });
});
