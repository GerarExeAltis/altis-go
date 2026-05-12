import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import {
  criarEventoTest, criarPremioTest, criarSessaoTest, limparEvento,
} from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string, opJwt: string;
let premioId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  premioId = await criarPremioTest(eventoId, { nome: 'X', peso: 1, ordem: 1 });
  opJwt = await operadorJwt(operadorId);
});

afterAll(async () => { await limparEvento(eventoId); });

let telCounter = 0;
async function sessaoGirando(): Promise<string> {
  telCounter += 1;
  const tel = '5499001' + String(telCounter).padStart(4, '0');
  const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_dados');
  const { error } = await sb.from('sessoes_jogo').update({
    jogador_nome: 'X', jogador_telefone: tel, jogador_email: 'x@x',
    premio_sorteado_id: premioId, status: 'girando',
  }).eq('id', sid);
  if (error) throw new Error(`sessaoGirando: ${error.message}`);
  return sid;
}

describe('concluir-animacao', () => {
  it('girando -> finalizada + finalizada_em preenchido', async () => {
    const sid = await sessaoGirando();
    const r = await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r.status).toBe(200);
    const { data } = await sb.from('sessoes_jogo')
      .select('status, finalizada_em').eq('id', sid).single();
    expect(data?.status).toBe('finalizada');
    expect(data?.finalizada_em).toBeTruthy();
  });

  it('idempotente: ja finalizada -> 200', async () => {
    const sid = await sessaoGirando();
    await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    const r2 = await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r2.status).toBe(200);
  });

  it('status errado -> 409', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const r = await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r.status).toBe(409);
  });
});
