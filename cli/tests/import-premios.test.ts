import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTestEnv } from './helpers/fixtures.js';
import { importPremios } from '../src/commands/import-premios.js';
import { getAdminClient } from '../src/lib/supabase-admin.js';

const EVENTO_DEMO = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
let tmpDir: string;

beforeAll(() => {
  loadTestEnv();
  tmpDir = mkdtempSync(join(tmpdir(), 'altis-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const sb = getAdminClient();
  await sb.from('premios').delete()
    .eq('evento_id', EVENTO_DEMO).like('nome', 'CSV_%');
});

function arquivoCsv(linhas: string[]): string {
  const p = join(tmpDir, `csv-${Date.now()}-${Math.random()}.csv`);
  writeFileSync(p, linhas.join('\n'), 'utf8');
  return p;
}

describe('cli: import-premios', () => {
  it('CSV válido insere prêmios no evento ativo', async () => {
    const file = arquivoCsv([
      'nome,descricao,cor_hex,peso_base,estoque_inicial,ordem_roleta,e_premio_real',
      'CSV_A,desc1,#abcdef,1,10,10,true',
      'CSV_B,desc2,#123456,5,3,11,true',
    ]);
    const result = await importPremios(file, {});
    expect(result.inseridos).toBe(2);
    const sb = getAdminClient();
    const { data } = await sb.from('premios')
      .select('nome, peso_base, estoque_inicial, estoque_atual')
      .like('nome', 'CSV_%').order('nome');
    expect(data).toHaveLength(2);
    expect(data?.[0]).toMatchObject({
      nome: 'CSV_A', peso_base: 1, estoque_inicial: 10, estoque_atual: 10,
    });
  });

  it('cor_hex inválido rejeita linha (não insere parcial)', async () => {
    const file = arquivoCsv([
      'nome,descricao,cor_hex,peso_base,estoque_inicial,ordem_roleta,e_premio_real',
      'CSV_OK,desc,#aabbcc,1,10,1,true',
      'CSV_BAD,desc,naoehex,1,10,2,true',
    ]);
    await expect(importPremios(file, {})).rejects.toThrow(/cor_hex/i);
    const sb = getAdminClient();
    const { data } = await sb.from('premios').select('nome').like('nome', 'CSV_%');
    expect(data).toEqual([]);
  });

  it('arquivo inexistente lança erro', async () => {
    await expect(importPremios('/nao/existe.csv', {})).rejects.toThrow(/n.o encontrado/i);
  });

  it('CSV sem header obrigatório falha', async () => {
    const file = arquivoCsv([
      'nome,peso_base',
      'CSV_X,1',
    ]);
    await expect(importPremios(file, {})).rejects.toThrow(/coluna obrigat.ria/i);
  });

  it('e_premio_real false aceita estoque_inicial=0', async () => {
    const file = arquivoCsv([
      'nome,descricao,cor_hex,peso_base,estoque_inicial,ordem_roleta,e_premio_real',
      'CSV_NaoFoi,nope,#555555,30,0,99,false',
    ]);
    const result = await importPremios(file, {});
    expect(result.inseridos).toBe(1);
  });
});
