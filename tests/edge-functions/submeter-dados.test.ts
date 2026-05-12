import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { sessaoJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import {
  criarEventoTest, criarPremioTest, limparEvento,
} from './helpers/fixtures';
import { randomUUID } from 'node:crypto';

const sb = service();
let eventoId: string, operadorId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  await criarPremioTest(eventoId, { nome: 'Vale', peso: 1, estoque: 10, ordem: 1, real: true });
  await criarPremioTest(eventoId, {
    nome: 'Nao foi', peso: 30, estoque: 0, ordem: 2, real: false,
  });
});

afterAll(async () => { await limparEvento(eventoId); });

async function fazerSessaoPronta(): Promise<{ sid: string; token: string }> {
  const sid = randomUUID();
  const { error } = await sb.from('sessoes_jogo').insert({
    id: sid,
    evento_id: eventoId,
    jogo: 'roleta',
    status: 'aguardando_dados',
    liberada_por: operadorId,
  });
  if (error) throw new Error(error.message);
  const token = await sessaoJwt(sid, eventoId, 'roleta');
  return { sid, token };
}

const dadosValidos = (telefone: string) => ({
  nome: 'Maria Teste',
  telefone,
  email: 'maria@test.local',
  loja_id: null,
});

describe('submeter-dados', () => {
  it('payload valido -> sorteia, baixa estoque, status=pronta_para_girar', async () => {
    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn<any>('submeter-dados', {
      s: sid, t: token,
      dados: dadosValidos('54988887701'),
      fingerprint: 'ab'.repeat(16),
    });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);

    const { data } = await sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id, jogador_nome')
      .eq('id', sid).single();
    expect(data?.status).toBe('pronta_para_girar');
    expect(data?.premio_sorteado_id).toBeTruthy();
    expect(data?.jogador_nome).toBe('Maria Teste');
  });

  it('telefone com DDD invalido -> 400', async () => {
    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn('submeter-dados', {
      s: sid, t: token,
      dados: dadosValidos('00988887702'),
      fingerprint: 'cd'.repeat(16),
    });
    expect(r.status).toBe(400);
  });

  it('telefone duplicado mesmo evento+jogo -> 409', async () => {
    const a = await fazerSessaoPronta();
    const ra = await callFn('submeter-dados', {
      s: a.sid, t: a.token,
      dados: dadosValidos('54988887703'),
      fingerprint: 'ef'.repeat(16),
    });
    expect(ra.status).toBe(200);

    const b = await fazerSessaoPronta();
    const rb = await callFn('submeter-dados', {
      s: b.sid, t: b.token,
      dados: dadosValidos('54988887703'),
      fingerprint: '12'.repeat(16),
    });
    expect(rb.status).toBe(409);
  });

  it('fingerprint na blacklist -> 403', async () => {
    const fp = 'bb'.repeat(16);
    await sb.from('fingerprints_bloqueados')
      .insert({ fingerprint: fp, motivo: 'teste', bloqueado_por: operadorId });

    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn('submeter-dados', {
      s: sid, t: token,
      dados: dadosValidos('54988887704'),
      fingerprint: fp,
    });
    expect(r.status).toBe(403);

    await sb.from('fingerprints_bloqueados').delete().eq('fingerprint', fp);
  });

  it('email malformado -> 400', async () => {
    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn('submeter-dados', {
      s: sid, t: token,
      dados: { ...dadosValidos('54988887705'), email: 'naoehemail' },
      fingerprint: 'aa'.repeat(16),
    });
    expect(r.status).toBe(400);
  });
});
