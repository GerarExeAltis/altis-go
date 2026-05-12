import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from '../lib/env.js';
import { getAdminClient } from '../lib/supabase-admin.js';
import { log } from '../lib/logger.js';
import type { EnvOpts } from '../lib/env.js';

interface BackupOpts extends EnvOpts {
  saida?: string;
}

interface BackupResult {
  pasta: string;
  arquivos: string[];
}

/** Mascara: 54988887766 -> (54)9****-7766 */
function mascararTelefone(tel: string): string {
  const ddd = tel.slice(0, 2);
  const ultimo4 = tel.slice(-4);
  return `(${ddd})9****-${ultimo4}`;
}

export async function backup(opts: BackupOpts): Promise<BackupResult> {
  if (opts.envFile) loadEnv(opts);
  const saidaBase = opts.saida ?? './backups';
  const hoje = new Date().toISOString().slice(0, 10);
  const pasta = join(saidaBase, hoje);
  mkdirSync(pasta, { recursive: true });

  const sb = getAdminClient();

  log.step('Dumpando eventos...');
  const { data: eventos, error: evErr } = await sb
    .from('eventos').select('*').order('criado_em', { ascending: false });
  if (evErr) throw new Error(`select eventos: ${evErr.message}`);

  log.step('Dumpando prêmios...');
  const { data: premios, error: pErr } = await sb.from('premios').select('*');
  if (pErr) throw new Error(`select premios: ${pErr.message}`);

  log.step('Dumpando ganhadores (telefones mascarados)...');
  const { data: ganhadoresRaw, error: gErr } = await sb
    .from('ganhadores').select('*').order('ganho_em', { ascending: false });
  if (gErr) throw new Error(`select ganhadores: ${gErr.message}`);
  const ganhadores = (ganhadoresRaw ?? []).map(
    (g: { jogador_telefone: string } & Record<string, unknown>) => ({
      ...g,
      jogador_telefone: mascararTelefone(g.jogador_telefone),
    })
  );

  log.step('Dumpando auditoria...');
  const { data: auditoria, error: aErr } = await sb
    .from('auditoria').select('*').order('criado_em', { ascending: false });
  if (aErr) throw new Error(`select auditoria: ${aErr.message}`);

  const arquivos = [
    ['eventos.json',    eventos],
    ['premios.json',    premios],
    ['ganhadores.json', ganhadores],
    ['auditoria.json',  auditoria],
  ] as const;

  const escritos: string[] = [];
  for (const [nome, dados] of arquivos) {
    const fp = join(pasta, nome);
    writeFileSync(fp, JSON.stringify(dados ?? [], null, 2), 'utf8');
    escritos.push(fp);
  }

  log.ok(`Backup gravado em ${pasta} (${escritos.length} arquivos)`);
  return { pasta, arquivos: escritos };
}
