import { describe, it, expect, beforeAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';

const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const SENHA_OK    = 'admin123';
const SENHA_RUIM  = 'errada123';

let opJwt: string;
beforeAll(async () => { opJwt = await operadorJwt(OPERADOR_ID); });

describe('validar-senha-admin', () => {
  it('senha correta retorna JWT-Admin com claim admin_elevado', async () => {
    const r = await callFn<{ token: string; exp: number }>(
      'validar-senha-admin',
      { senha: SENHA_OK },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(200);
    expect(r.body.token).toBeTypeOf('string');
    expect(r.body.exp).toBeTypeOf('number');
    const payload = JSON.parse(
      Buffer.from(r.body.token.split('.')[1], 'base64url').toString()
    );
    expect(payload.admin_elevado).toBe(true);
    expect(payload.sub).toBe(OPERADOR_ID);
  });

  it('senha errada retorna 401', async () => {
    const r = await callFn(
      'validar-senha-admin',
      { senha: SENHA_RUIM },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(401);
  });

  it('payload sem senha retorna 400', async () => {
    const r = await callFn(
      'validar-senha-admin',
      {},
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(400);
  });

  it('sem JWT-Operador retorna 401', async () => {
    const r = await callFn('validar-senha-admin', { senha: SENHA_OK });
    expect(r.status).toBe(401);
  });
});
