import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadTestEnv, senhaAdminAtualOk } from './helpers/fixtures.js';
import { definirSenhaAdmin } from '../src/commands/definir-senha-admin.js';

beforeAll(() => { loadTestEnv(); });

afterAll(async () => {
  // Restaura senha de DEV ('admin123') para próximos testes não quebrarem
  await definirSenhaAdmin({ senha: 'admin123' });
});

describe('cli: definir-senha-admin', () => {
  it('grava senha forte e verificar_senha_admin retorna true', async () => {
    const novaSenha = 'NovaSenhaForte123';
    await definirSenhaAdmin({ senha: novaSenha });
    expect(await senhaAdminAtualOk(novaSenha)).toBe(true);
  });

  it('senha curta (<8) é rejeitada', async () => {
    await expect(definirSenhaAdmin({ senha: 'curta' }))
      .rejects.toThrow(/8 caracteres/i);
  });

  it('senha antiga deixa de funcionar após troca', async () => {
    await definirSenhaAdmin({ senha: 'AntigaSenha999' });
    await definirSenhaAdmin({ senha: 'OutraNovaSenha000' });
    expect(await senhaAdminAtualOk('AntigaSenha999')).toBe(false);
    expect(await senhaAdminAtualOk('OutraNovaSenha000')).toBe(true);
  });
});
