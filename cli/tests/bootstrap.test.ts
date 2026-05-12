import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTestEnv } from './helpers/fixtures.js';

let tmpDir: string;
let envFile: string;

beforeAll(() => {
  loadTestEnv();
  tmpDir = mkdtempSync(join(tmpdir(), 'boot-'));
  envFile = join(tmpDir, '.env.local');
});

afterAll(async () => {
  rmSync(tmpDir, { recursive: true, force: true });
  // Restaura senha de DEV para próximos testes
  const { definirSenhaAdmin } = await import('../src/commands/definir-senha-admin.js');
  await definirSenhaAdmin({ senha: 'admin123' });
});

// Stub migrate (subprocess de supabase): bootstrap o chama mas testes nao precisam rodar de verdade.
vi.mock('../src/commands/migrate.js', () => ({
  migrate: vi.fn().mockResolvedValue(undefined),
}));

import { bootstrap } from '../src/commands/bootstrap.js';

describe('cli: bootstrap', () => {
  it('--non-interactive grava .env.local com SESSAO_JWT_SECRET gerado', async () => {
    await bootstrap({
      nonInteractive: true,
      envFile,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      senhaAdmin: 'BootstrapTestSenha9',
    });
    expect(existsSync(envFile)).toBe(true);
    const conteudo = readFileSync(envFile, 'utf8');
    expect(conteudo).toMatch(/^SUPABASE_URL=/m);
    expect(conteudo).toMatch(/^SUPABASE_SERVICE_ROLE_KEY=/m);
    expect(conteudo).toMatch(/^SESSAO_JWT_SECRET=.{40,}/m);
  });

  it('não sobrescreve .env.local existente (sem --force)', async () => {
    const orig = readFileSync(envFile, 'utf8');
    await expect(bootstrap({
      nonInteractive: true,
      envFile,
      supabaseUrl: 'http://x',
      supabaseServiceRoleKey: 'keyverylongenoughfortestingpurposes',
      senhaAdmin: 'Outra1234',
    })).rejects.toThrow(/já existe/i);
    expect(readFileSync(envFile, 'utf8')).toBe(orig);
  });
});
