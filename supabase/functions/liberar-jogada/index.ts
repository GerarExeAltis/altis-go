import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errUnauthorized, errConflict } from '../_shared/errors.ts';
import { parseBody } from '../_shared/validators.ts';
import { signSessaoToken, getOperadorIdFromHeader } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { audit, extractClientMeta } from '../_shared/audit.ts';

const bodySchema = z.object({
  jogo: z.enum(['roleta', 'dados']),
});

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const operadorId = await getOperadorIdFromHeader(req);
    if (!operadorId) throw errUnauthorized('JWT-Operador ausente ou inválido');

    const { jogo } = parseBody(bodySchema, await req.json());
    const sb = getServiceClient();
    const meta = extractClientMeta(req);

    const { data: evento, error: evErr } = await sb
      .from('eventos')
      .select('id')
      .eq('status', 'ativo')
      .maybeSingle();
    if (evErr) throw new Error(`select evento ativo: ${evErr.message}`);
    if (!evento) throw errConflict('Nenhum evento ativo no momento');

    const { data: sessao, error: sErr } = await sb
      .from('sessoes_jogo')
      .insert({
        evento_id: evento.id,
        jogo,
        status: 'aguardando_celular',
        liberada_por: operadorId,
      })
      .select('id, evento_id')
      .single();
    if (sErr || !sessao) throw new Error(`insert sessao: ${sErr?.message}`);

    const { token, expiraEm } = await signSessaoToken(sessao.id, sessao.evento_id, jogo);

    await audit(sb, {
      evento_id: sessao.evento_id,
      acao: 'liberar_jogada',
      ator: operadorId,
      recurso_tipo: 'sessoes_jogo',
      recurso_id: sessao.id,
      detalhes: { jogo },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return jsonOk({
      sessao_id: sessao.id,
      token,
      expira_em: expiraEm.toISOString(),
    });
  } catch (err) {
    return jsonErr(err);
  }
});
