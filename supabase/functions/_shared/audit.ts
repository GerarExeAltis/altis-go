import type { SupabaseClient } from './deps.ts';

export interface AuditEntry {
  evento_id?: string | null;
  acao: string;
  ator?: string | null;
  recurso_tipo?: string | null;
  recurso_id?: string | null;
  detalhes?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
}

/** Insere um registro de auditoria. Não bloqueia; loga erro se falhar. */
export async function audit(
  client: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  const { error } = await client.from('auditoria').insert({
    evento_id:    entry.evento_id    ?? null,
    acao:         entry.acao,
    ator:         entry.ator         ?? null,
    recurso_tipo: entry.recurso_tipo ?? null,
    recurso_id:   entry.recurso_id   ?? null,
    detalhes:     entry.detalhes     ?? {},
    ip:           entry.ip           ?? null,
    user_agent:   entry.user_agent   ?? null,
  });
  if (error) {
    console.error('[audit] falha ao inserir:', error);
  }
}

/** Extrai IP e User-Agent do Request para passar ao audit. */
export function extractClientMeta(
  req: Request
): { ip: string | null; user_agent: string | null } {
  const ua = req.headers.get('User-Agent');
  const xff = req.headers.get('X-Forwarded-For');
  const ip = xff ? xff.split(',')[0].trim() : null;
  return { ip, user_agent: ua };
}
