import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = 'http://127.0.0.1:54321';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const EVENTO_SEED = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';

function service(): SupabaseClient {
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function criarEventoLimpo(): Promise<{ eventoId: string; premioRealId: string; premioNaoFoiId: string }> {
  const sb = service();
  await sb.from('eventos').update({ status: 'encerrado' }).eq('status', 'ativo');

  const eventoId = randomUUID();
  await sb.from('eventos').insert({
    id: eventoId,
    nome: `E2E Evento ${eventoId.slice(0, 8)}`,
    descricao: 'Evento criado por teste E2E',
    data_inicio: new Date().toISOString().slice(0, 10),
    data_fim: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    status: 'ativo',
    criado_por: '00000000-0000-0000-0000-000000000001',
  });

  const premioRealId = randomUUID();
  const premioNaoFoiId = randomUUID();
  await sb.from('premios').insert([
    {
      id: premioRealId,
      evento_id: eventoId,
      nome: 'Vale R$10 E2E',
      peso_base: 1000,
      estoque_inicial: 100,
      estoque_atual: 100,
      ordem_roleta: 1,
      e_premio_real: true,
    },
    {
      id: premioNaoFoiId,
      evento_id: eventoId,
      nome: 'Nao foi E2E',
      peso_base: 1,
      estoque_inicial: 0,
      estoque_atual: 0,
      ordem_roleta: 2,
      e_premio_real: false,
    },
  ]);

  return { eventoId, premioRealId, premioNaoFoiId };
}

export async function limparEvento(eventoId: string): Promise<void> {
  const sb = service();
  await sb.from('eventos').delete().eq('id', eventoId);
  await sb.from('eventos').update({ status: 'ativo' }).eq('id', EVENTO_SEED);
}

export async function clearAuditoriaAdminLogin(): Promise<void> {
  const sb = service();
  await sb.from('auditoria').delete().like('acao', 'admin_login%');
}

export function getServiceClient(): SupabaseClient {
  return service();
}
