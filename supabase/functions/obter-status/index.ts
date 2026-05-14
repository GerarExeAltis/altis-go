// Edge Function `obter-status` — polling minimo do estado da sessao para
// o celular (que e anonimo e nao pode ler sessoes_jogo diretamente por
// causa da RLS). Recebe (s, t), valida o JWT da sessao e retorna apenas
// `status` e `premio_sorteado_id` (SEM PII). Usado por usePollingStatus
// em src/hooks/usePollingStatus.ts.

import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errConflict } from '../_shared/errors.ts';
import { parseBody, uuidSchema } from '../_shared/validators.ts';
import { verifySessaoToken } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const bodySchema = z.object({
  s: uuidSchema,
  t: z.string().min(10),
});

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const { s, t } = parseBody(bodySchema, await req.json());
    await verifySessaoToken(t, s);

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('sessoes_jogo')
      .select('status, premio_sorteado_id')
      .eq('id', s)
      .single();

    if (error || !data) throw errConflict('Sessão não encontrada');

    return jsonOk({
      status: data.status,
      premio_sorteado_id: data.premio_sorteado_id ?? null,
    });
  } catch (err) {
    return jsonErr(err);
  }
});
