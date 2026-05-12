import { describe, it, expect, beforeAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';

const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_DEMO = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';

let opJwt: string;
const sb = service();

beforeAll(async () => { opJwt = await operadorJwt(OPERADOR_ID); });

describe('liberar-jogada', () => {
  it('cria sessao em aguardando_celular e retorna JWT-Sessao', async () => {
    const r = await callFn<{ sessao_id: string; token: string; expira_em: string }>(
      'liberar-jogada',
      { jogo: 'roleta' },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(200);
    expect(r.body.sessao_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.body.token.split('.')).toHaveLength(3);
    expect(new Date(r.body.expira_em).getTime()).toBeGreaterThan(Date.now());

    const { data } = await sb.from('sessoes_jogo')
      .select('status, evento_id, jogo, liberada_por')
      .eq('id', r.body.sessao_id).single();
    expect(data?.status).toBe('aguardando_celular');
    expect(data?.evento_id).toBe(EVENTO_DEMO);
    expect(data?.jogo).toBe('roleta');
    expect(data?.liberada_por).toBe(OPERADOR_ID);
  });

  it('falha sem JWT-Operador', async () => {
    const r = await callFn('liberar-jogada', { jogo: 'roleta' });
    expect(r.status).toBe(401);
  });

  it('falha com jogo invalido', async () => {
    const r = await callFn(
      'liberar-jogada',
      { jogo: 'cartas' },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(400);
  });

  it('grava auditoria com acao=liberar_jogada', async () => {
    const r = await callFn<{ sessao_id: string }>(
      'liberar-jogada',
      { jogo: 'roleta' },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(200);
    const { data } = await sb.from('auditoria')
      .select('acao, ator, recurso_id')
      .eq('recurso_id', r.body.sessao_id).single();
    expect(data?.acao).toBe('liberar_jogada');
    expect(data?.ator).toBe(OPERADOR_ID);
  });
});
