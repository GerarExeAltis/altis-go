import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { sessaoJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import {
  criarEventoTest,
  criarPremioTest,
  criarSessaoTest,
  limparEvento,
} from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId;
  operadorId = r.operadorId;
  await criarPremioTest(eventoId, { nome: 'Vale', peso: 1, ordem: 1 });
  await criarPremioTest(eventoId, {
    nome: 'Nao foi', peso: 30, estoque: 0, real: false, ordem: 2,
  });
});

afterAll(async () => { await limparEvento(eventoId); });

describe('obter-sessao', () => {
  it('token valido + sessao aguardando_celular -> retorna premios e muda status', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const token = await sessaoJwt(sid, eventoId, 'roleta');

    const r = await callFn<any>('obter-sessao', { s: sid, t: token });
    expect(r.status).toBe(200);
    expect(r.body.sessao.id).toBe(sid);
    expect(Array.isArray(r.body.premios)).toBe(true);
    expect(r.body.premios.length).toBe(2);
    expect(r.body.premios[0]).toMatchObject({ nome: 'Vale', ordem_roleta: 1 });

    const { data } = await sb.from('sessoes_jogo')
      .select('status').eq('id', sid).single();
    expect(data?.status).toBe('aguardando_dados');
  });

  it('token expirado -> 401', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const token = await sessaoJwt(sid, eventoId, 'roleta', -1);
    const r = await callFn('obter-sessao', { s: sid, t: token });
    expect(r.status).toBe(401);
  });

  it('token de outra sessao -> 401', async () => {
    const sidReal = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const sidOutra = '11111111-2222-3333-4444-555555555555';
    const token = await sessaoJwt(sidOutra, eventoId, 'roleta');
    const r = await callFn('obter-sessao', { s: sidReal, t: token });
    expect(r.status).toBe(401);
  });

  it('sessao em status errado -> 409', async () => {
    // Cria sessao finalizada usando um dos premios existentes
    const { data: p } = await sb.from('premios')
      .select('id').eq('evento_id', eventoId).limit(1).single();
    const sid = await criarSessaoTest(eventoId, operadorId, 'finalizada', p!.id);
    const token = await sessaoJwt(sid, eventoId, 'roleta');
    const r = await callFn('obter-sessao', { s: sid, t: token });
    expect(r.status).toBe(409);
  });
});
