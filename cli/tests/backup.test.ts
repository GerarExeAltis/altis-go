import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTestEnv } from './helpers/fixtures.js';
import { backup } from '../src/commands/backup.js';

let tmpDir: string;
beforeAll(() => { loadTestEnv(); tmpDir = mkdtempSync(join(tmpdir(), 'bkp-')); });
afterAll(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe('cli: backup', () => {
  it('cria 4 arquivos JSON em <saida>/<data>/', async () => {
    const result = await backup({ saida: tmpDir });
    expect(result.arquivos).toHaveLength(4);
    const pasta = result.pasta;
    const ls = readdirSync(pasta).sort();
    expect(ls).toEqual([
      'auditoria.json', 'eventos.json', 'ganhadores.json', 'premios.json',
    ]);
    for (const f of ls) {
      const c = readFileSync(join(pasta, f), 'utf8');
      expect(() => JSON.parse(c)).not.toThrow();
    }
  });

  it('telefones em ganhadores ficam mascarados', async () => {
    const { getAdminClient } = await import('../src/lib/supabase-admin.js');
    const sb = getAdminClient();
    const EVENTO_DEMO = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
    const { data: p } = await sb.from('premios').select('id')
      .eq('evento_id', EVENTO_DEMO).limit(1).single();
    const { data: sess } = await sb.from('sessoes_jogo').insert({
      evento_id: EVENTO_DEMO, jogo: 'roleta', status: 'finalizada',
      liberada_por: '00000000-0000-0000-0000-000000000001',
      jogador_nome: 'Backup Tester', jogador_telefone: '54988887766',
      jogador_email: 'b@b', premio_sorteado_id: p!.id,
    }).select('id').single();
    await sb.from('ganhadores').insert({
      sessao_id: sess!.id, evento_id: EVENTO_DEMO, premio_id: p!.id,
      jogador_nome: 'Backup Tester', jogador_telefone: '54988887766',
      jogador_email: 'b@b',
    });

    const r = await backup({ saida: tmpDir });
    const ganh = JSON.parse(readFileSync(join(r.pasta, 'ganhadores.json'), 'utf8'));
    const meu = ganh.find((g: any) => g.jogador_nome === 'Backup Tester');
    expect(meu).toBeTruthy();
    expect(meu.jogador_telefone).toMatch(/^\(54\)9\*{4}-\d{4}$/);
    expect(meu.jogador_telefone).not.toContain('888877');

    await sb.from('ganhadores').delete().eq('sessao_id', sess!.id);
    await sb.from('sessoes_jogo').delete().eq('id', sess!.id);
  });

  it('saída inexistente é criada', async () => {
    const aninhada = join(tmpDir, 'nao', 'existe', 'ainda');
    const r = await backup({ saida: aninhada });
    expect(r.arquivos.length).toBe(4);
  });
});
