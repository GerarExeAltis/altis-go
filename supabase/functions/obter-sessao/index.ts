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

    const { data: sessao, error: sErr } = await sb
      .from('sessoes_jogo')
      .select('id, evento_id, jogo, status, expira_em')
      .eq('id', s)
      .single();
    if (sErr || !sessao) throw errConflict('Sessão não encontrada');

    if (!['aguardando_celular', 'aguardando_dados'].includes(sessao.status)) {
      throw errConflict(`Sessão em status inválido: ${sessao.status}`);
    }

    if (sessao.status === 'aguardando_celular') {
      const { error: uErr } = await sb
        .from('sessoes_jogo')
        .update({ status: 'aguardando_dados' })
        .eq('id', s)
        .eq('status', 'aguardando_celular');
      if (uErr) throw new Error(`update status: ${uErr.message}`);
    }

    const { data: premios } = await sb.from('premios')
      .select('id, nome, foto_path, ordem_roleta, e_premio_real')
      .eq('evento_id', sessao.evento_id)
      .order('ordem_roleta', { ascending: true });

    return jsonOk({
      sessao: { id: sessao.id, jogo: sessao.jogo, expira_em: sessao.expira_em },
      premios: premios ?? [],
    });
  } catch (err) {
    return jsonErr(err);
  }
});
