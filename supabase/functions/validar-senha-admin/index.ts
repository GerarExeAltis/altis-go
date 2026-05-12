import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errUnauthorized, errTooManyRequests } from '../_shared/errors.ts';
import { parseBody } from '../_shared/validators.ts';
import { signAdminToken, getOperadorIdFromHeader } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { audit, extractClientMeta } from '../_shared/audit.ts';

const bodySchema = z.object({ senha: z.string().min(1).max(200) });

const MAX_TENTATIVAS = 5;
const JANELA_MIN     = 10;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const operadorId = await getOperadorIdFromHeader(req);
    if (!operadorId) throw errUnauthorized('JWT-Operador ausente ou inválido');

    const { senha } = parseBody(bodySchema, await req.json());
    const sb = getServiceClient();
    const meta = extractClientMeta(req);

    // Rate limit por IP nos últimos 10min.
    if (meta.ip) {
      const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
      const { count } = await sb
        .from('auditoria')
        .select('*', { count: 'exact', head: true })
        .eq('acao', 'admin_login_falhou')
        .eq('ip', meta.ip)
        .gte('criado_em', desde);
      if ((count ?? 0) >= MAX_TENTATIVAS) {
        await audit(sb, {
          acao: 'admin_login_bloqueado',
          ator: operadorId,
          ip: meta.ip,
          user_agent: meta.user_agent,
          detalhes: { tentativas: count },
        });
        throw errTooManyRequests('Muitas tentativas falhas. Tente novamente em 30 minutos.');
      }
    }

    // Validar senha via função SECURITY DEFINER (bcrypt server-side).
    const { data: ok, error: rpcErr } = await sb
      .schema('private')
      .rpc('verificar_senha_admin', { p_senha: senha });
    if (rpcErr) throw new Error(`verificar_senha_admin RPC: ${rpcErr.message}`);

    if (!ok) {
      await audit(sb, {
        acao: 'admin_login_falhou',
        ator: operadorId,
        ip: meta.ip,
        user_agent: meta.user_agent,
      });
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
      throw errUnauthorized('Senha inválida');
    }

    const { token, expiraEm, jti } = await signAdminToken(operadorId);
    await audit(sb, {
      acao: 'admin_login',
      ator: operadorId,
      ip: meta.ip,
      user_agent: meta.user_agent,
      detalhes: { jti },
    });

    return jsonOk({ token, exp: Math.floor(expiraEm.getTime() / 1000) });
  } catch (err) {
    return jsonErr(err);
  }
});
