import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadTestEnv } from './helpers/fixtures.js';
import { getAdminClient } from '../src/lib/supabase-admin.js';
import { randomUUID } from 'node:crypto';

const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_DEMO = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
let sessaoId: string;
let premioId: string;

beforeAll(() => { loadTestEnv(); });

afterAll(async () => {
  const sb = getAdminClient();
  if (sessaoId) {
    await sb.from('ganhadores').delete().eq('sessao_id', sessaoId);
    await sb.from('sessoes_jogo').delete().eq('id', sessaoId);
  }
});

describe('totem smoke: fluxo SQL completo do servidor', () => {
  it('liberar -> obter -> submeter -> iniciar -> concluir muda status conforme esperado', async () => {
    const sb = getAdminClient();

    sessaoId = randomUUID();
    const { error: e1 } = await sb.from('sessoes_jogo').insert({
      id: sessaoId,
      evento_id: EVENTO_DEMO,
      jogo: 'roleta',
      status: 'aguardando_celular',
      liberada_por: OPERADOR_ID,
    });
    expect(e1).toBeNull();

    await sb.from('sessoes_jogo').update({ status: 'aguardando_dados' }).eq('id', sessaoId);

    await sb.from('sessoes_jogo').update({
      jogador_nome: 'Smoke',
      jogador_telefone: '54988889999',
      jogador_email: 's@s',
    }).eq('id', sessaoId);

    const { error: rpcErr } = await sb.rpc('sortear_e_baixar_estoque', { p_sessao_id: sessaoId });
    expect(rpcErr).toBeNull();

    const { data: s1 } = await sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id').eq('id', sessaoId).single();
    expect(s1?.status).toBe('pronta_para_girar');
    expect(s1?.premio_sorteado_id).toBeTruthy();
    premioId = s1!.premio_sorteado_id as string;

    await sb.from('sessoes_jogo').update({ status: 'girando' }).eq('id', sessaoId);

    await sb.from('sessoes_jogo').update({
      status: 'finalizada',
      finalizada_em: new Date().toISOString(),
    }).eq('id', sessaoId);

    const { data: s2 } = await sb.from('sessoes_jogo')
      .select('status, finalizada_em').eq('id', sessaoId).single();
    expect(s2?.status).toBe('finalizada');
    expect(s2?.finalizada_em).toBeTruthy();

    const { data: g } = await sb.from('ganhadores')
      .select('jogador_nome, premio_id').eq('sessao_id', sessaoId).single();
    expect(g?.jogador_nome).toBe('Smoke');
    expect(g?.premio_id).toBe(premioId);
  });
});
