import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { loadEnv } from '../lib/env.js';
import { getAdminClient } from '../lib/supabase-admin.js';
import { log } from '../lib/logger.js';
import type { EnvOpts } from '../lib/env.js';

const COLUNAS_OBRIGATORIAS = [
  'nome', 'descricao', 'peso_base',
  'estoque_inicial', 'ordem_roleta', 'e_premio_real',
] as const;

interface LinhaCsv {
  nome: string;
  descricao: string;
  peso_base: string;
  estoque_inicial: string;
  ordem_roleta: string;
  e_premio_real: string;
}

export async function importPremios(
  arquivo: string,
  opts: EnvOpts
): Promise<{ inseridos: number }> {
  if (opts.envFile) loadEnv(opts);

  if (!existsSync(arquivo)) {
    throw new Error(`Arquivo CSV não encontrado: ${arquivo}`);
  }

  const conteudo = readFileSync(arquivo, 'utf8');
  const linhas = parse(conteudo, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as LinhaCsv[];

  const header = linhas[0] ? Object.keys(linhas[0]) : [];
  for (const c of COLUNAS_OBRIGATORIAS) {
    if (!header.includes(c)) {
      throw new Error(
        `CSV não tem coluna obrigatória '${c}'. Header recebido: ${header.join(', ')}`
      );
    }
  }

  const inserts = linhas.map((l, idx) => {
    const peso = Number(l.peso_base);
    if (!Number.isInteger(peso) || peso < 0) {
      throw new Error(`Linha ${idx + 2}: peso_base inválido '${l.peso_base}'.`);
    }
    const estoque = Number(l.estoque_inicial);
    if (!Number.isInteger(estoque) || estoque < 0) {
      throw new Error(`Linha ${idx + 2}: estoque_inicial inválido '${l.estoque_inicial}'.`);
    }
    const ordem = Number(l.ordem_roleta);
    if (!Number.isInteger(ordem)) {
      throw new Error(`Linha ${idx + 2}: ordem_roleta inválido '${l.ordem_roleta}'.`);
    }
    const real = l.e_premio_real.toLowerCase() === 'true';
    return {
      nome: l.nome,
      descricao: l.descricao || null,
      peso_base: peso,
      estoque_inicial: estoque,
      estoque_atual: estoque,
      ordem_roleta: ordem,
      e_premio_real: real,
    };
  });

  const sb = getAdminClient();

  const { data: evento, error: evErr } = await sb
    .from('eventos').select('id, nome').eq('status', 'ativo').maybeSingle();
  if (evErr) throw new Error(`select evento ativo: ${evErr.message}`);
  if (!evento) throw new Error('Nenhum evento com status=ativo. Crie/ative um evento antes.');

  log.info(`Importando ${inserts.length} prêmios para evento '${evento.nome}' (${evento.id})...`);

  const linhasComEvento = inserts.map((p) => ({ ...p, evento_id: evento.id }));
  const { error: insErr } = await sb.from('premios').insert(linhasComEvento);
  if (insErr) throw new Error(`insert premios: ${insErr.message}`);

  log.ok(`${inserts.length} prêmios inseridos.`);
  return { inseridos: inserts.length };
}
