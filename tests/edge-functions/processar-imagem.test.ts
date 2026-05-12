import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminJwt, operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, criarPremioTest, limparEvento } from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string, adminTok: string, opTok: string;
let premioId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  premioId = await criarPremioTest(eventoId, { nome: 'X', peso: 1, ordem: 1 });
  adminTok = await adminJwt(operadorId);
  opTok = await operadorJwt(operadorId);
});

afterAll(async () => {
  // Apaga arquivos do bucket vinculados ao premio
  const { data } = await sb.storage.from('fotos_premios').list(premioId);
  if (data?.length) {
    await sb.storage.from('fotos_premios').remove(data.map((d) => `${premioId}/${d.name}`));
  }
  await limparEvento(eventoId);
});

function pngBytes(): Buffer {
  // PNG 1x1 transparente (~67 bytes) — bytes válidos do header.
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4' +
    '890000000a49444154789c63000100000005000100' +
    '0d0a2db40000000049454e44ae426082',
    'hex'
  );
}

async function postMultipart(
  url: string, file: Buffer, headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  const fd = new FormData();
  fd.append('premio_id', premioId);
  fd.append('arquivo', new Blob([file], { type: 'image/png' }), 'foto.png');
  const res = await fetch(url, { method: 'POST', headers, body: fd });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const URL = `${process.env.FUNCTIONS_URL}/processar-imagem`;

describe('processar-imagem', () => {
  it('admin envia PNG valido -> retorna foto_path e arquivo no Storage', async () => {
    const r = await postMultipart(URL, pngBytes(), { Authorization: `Bearer ${adminTok}` });
    expect(r.status).toBe(200);
    expect(r.body.foto_path).toMatch(new RegExp(`^${premioId}/`));

    const { data } = await sb.storage.from('fotos_premios').download(r.body.foto_path);
    expect(data).toBeTruthy();
  });

  it('operador sem admin -> 403', async () => {
    const r = await postMultipart(URL, pngBytes(), { Authorization: `Bearer ${opTok}` });
    expect(r.status).toBe(403);
  });

  it('sem auth -> 401', async () => {
    const r = await postMultipart(URL, pngBytes(), {});
    expect(r.status).toBe(401);
  });

  it('arquivo > 5MB -> 400', async () => {
    const big = Buffer.alloc(5_500_000, 0x80);
    const r = await postMultipart(URL, big, { Authorization: `Bearer ${adminTok}` });
    expect(r.status).toBe(400);
  });
});
