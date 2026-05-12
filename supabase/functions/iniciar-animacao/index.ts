import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errUnauthorized, errConflict } from '../_shared/errors.ts';
import { parseBody, uuidSchema } from '../_shared/validators.ts';
import { getOperadorIdFromHeader, verifySessaoToken } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

// Aceita DUAS formas:
//   { s, t }            -> jogador clica 'girar' no celular (capability token)
//   { sessao_id }       -> totem operador (Bearer JWT-Operador no header)
const bodySchema = z.union([
  z.object({ s: uuidSchema, t: z.string().min(10) }),
  z.object({ sessao_id: uuidSchema }),
]);

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const body = parseBody(bodySchema, await req.json());

    let sessaoId: string;
    if ('s' in body) {
      // Caminho jogador: valida JWT-Sessão (capability token do QR).
      await verifySessaoToken(body.t, body.s);
      sessaoId = body.s;
    } else {
      // Caminho operador: exige JWT-Operador no header.
      const operadorId = await getOperadorIdFromHeader(req);
      if (!operadorId) throw errUnauthorized('JWT-Operador ausente ou inválido');
      sessaoId = body.sessao_id;
    }

    const sb = getServiceClient();

    const { data: atual } = await sb
      .from('sessoes_jogo').select('status').eq('id', sessaoId).single();
    if (!atual) throw errConflict('Sessão não encontrada');
    if (atual.status === 'girando') {
      return jsonOk({ ok: true, status: 'girando' });
    }
    if (atual.status !== 'pronta_para_girar') {
      throw errConflict(`Status inválido: ${atual.status}`);
    }

    const { error } = await sb
      .from('sessoes_jogo')
      .update({ status: 'girando' })
      .eq('id', sessaoId)
      .eq('status', 'pronta_para_girar');
    if (error) throw new Error(`update girando: ${error.message}`);

    return jsonOk({ ok: true, status: 'girando' });
  } catch (err) {
    return jsonErr(err);
  }
});
