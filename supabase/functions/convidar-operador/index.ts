import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import {
  errBadRequest,
  errUnauthorized,
  errConflict,
  errInternal,
} from '../_shared/errors.ts';
import { parseBody, emailSchema, nomeSchema } from '../_shared/validators.ts';
import { getOperadorIdFromHeader } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { audit, extractClientMeta } from '../_shared/audit.ts';

/**
 * Envia convite por email para um novo operador. O Supabase Auth cria
 * o user em auth.users (pré-confirmado) e dispara um email com link
 * mágico — o operador clica, define a senha pela primeira vez, e ja
 * eh redirecionado pra app autenticado.
 *
 * Diferenca crucial vs auth.signUp():
 *   - signUp exige senha (que era gerada aleatoriamente e descartada
 *     no fluxo antigo — operador nunca conseguia logar).
 *   - inviteUserByEmail dispara o email e o usuario define a senha
 *     na primeira visita.
 *
 * O trigger tg_criar_perfil_operador_apos_signup cria a linha em
 * perfis_operadores com ativo=false; aqui ativamos imediatamente
 * apos o invite ser disparado — afinal, o admin esta explicitamente
 * autorizando a entrada deste operador.
 */

const bodySchema = z.object({
  email: emailSchema,
  nome: nomeSchema,
  /**
   * URL absoluta da pagina onde o operador vai cair apos clicar no
   * link do email (geralmente /redefinir-senha do front). Em prod o
   * Supabase whitelista contra a SITE_URL do projeto, entao nao
   * funciona pra dominios externos.
   */
  redirectTo: z.string().url().max(500),
});

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') {
    return jsonErr(errBadRequest('Método não permitido'));
  }

  try {
    // Autoriza: precisa de JWT-Admin elevado.
    const operadorAtual = await getOperadorIdFromHeader(req);
    if (!operadorAtual) throw errUnauthorized('JWT-Admin ausente ou inválido');

    const { email, nome, redirectTo } = parseBody(bodySchema, await req.json());
    const sb = getServiceClient();
    const meta = extractClientMeta(req);

    // Confirma que o operador atual ainda esta ativo (pode ter sido
    // desativado entre login e esta chamada).
    const { data: perfilAtual } = await sb
      .from('perfis_operadores')
      .select('ativo')
      .eq('id', operadorAtual)
      .maybeSingle();
    if (!perfilAtual?.ativo) {
      throw errUnauthorized('Operador atual não está ativo');
    }

    // Envia convite. Se o email ja existir em auth.users, retorna
    // erro 422 com mensagem "already been registered".
    const { data: inviteRes, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(
      email,
      {
        data: { nome_completo: nome },
        redirectTo,
      },
    );

    if (inviteErr) {
      // Email duplicado — caso comum e esperado, retornamos 409 com
      // mensagem clara em vez do 500 generico.
      if ((inviteErr as { status?: number }).status === 422) {
        throw errConflict('Já existe um operador com este e-mail');
      }
      throw errInternal(`Falha ao convidar: ${inviteErr.message}`);
    }

    const novoUserId = inviteRes?.user?.id;
    if (!novoUserId) {
      throw errInternal('Invite OK mas user.id ausente na resposta');
    }

    // Ativa o perfil imediatamente — o trigger ja criou a linha em
    // perfis_operadores com ativo=false. Como este convite eh
    // explicitamente autorizado por um admin ativo, podemos ativar.
    // Usa upsert para cobrir o caso (raro) do trigger nao ter
    // disparado ainda (race condition).
    const { error: upsertErr } = await sb
      .from('perfis_operadores')
      .upsert({ id: novoUserId, nome_completo: nome, ativo: true });
    if (upsertErr) {
      throw errInternal(`Falha ao ativar perfil: ${upsertErr.message}`);
    }

    await audit(sb, {
      acao: 'operador_convidado',
      ator: operadorAtual,
      ip: meta.ip,
      user_agent: meta.user_agent,
      detalhes: { novo_user_id: novoUserId, email },
    });

    return jsonOk({ user_id: novoUserId, email });
  } catch (err) {
    return jsonErr(err);
  }
});
