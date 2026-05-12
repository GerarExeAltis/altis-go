import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errConflict, errForbidden } from '../_shared/errors.ts';
import {
  parseBody, uuidSchema, dadosJogadorSchema, fingerprintSchema,
} from '../_shared/validators.ts';
import { verifySessaoToken } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { audit, extractClientMeta } from '../_shared/audit.ts';

const bodySchema = z.object({
  s: uuidSchema,
  t: z.string().min(10),
  dados: dadosJogadorSchema,
  fingerprint: fingerprintSchema,
});

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const { s, t, dados, fingerprint } = parseBody(bodySchema, await req.json());
    await verifySessaoToken(t, s);

    const sb = getServiceClient();
    const meta = extractClientMeta(req);

    const { data: bloqueado } = await sb
      .from('fingerprints_bloqueados')
      .select('fingerprint').eq('fingerprint', fingerprint).maybeSingle();
    if (bloqueado) throw errForbidden('Dispositivo bloqueado');

    const { data: sessao, error: uErr } = await sb
      .from('sessoes_jogo')
      .update({
        jogador_nome: dados.nome,
        jogador_telefone: dados.telefone,
        jogador_email: dados.email,
        jogador_loja_id: dados.loja_id ?? null,
        jogador_fingerprint: fingerprint,
        jogador_ip: meta.ip,
        jogador_user_agent: meta.user_agent,
      })
      .eq('id', s)
      .eq('status', 'aguardando_dados')
      .select('id, evento_id, jogo')
      .single();

    if (uErr) {
      // unique_violation pode vir como code '23505' OU como mensagem contendo o nome do índice.
      const code = (uErr as { code?: string }).code;
      const msg = (uErr as { message?: string }).message ?? '';
      if (code === '23505' || msg.includes('unq_jogada_tel_evento_jogo')) {
        throw errConflict(
          'Este telefone já jogou nesta Roleta. Cada celular pode jogar uma vez por evento por jogo.'
        );
      }
      throw new Error(`update sessao: ${uErr.message}`);
    }
    if (!sessao) throw errConflict('Sessão não está em aguardando_dados');

    const { error: rpcErr } = await sb.rpc('sortear_e_baixar_estoque', { p_sessao_id: s });
    if (rpcErr) {
      // Reverte dados gravados para liberar a sessão de novo.
      await sb.from('sessoes_jogo').update({
        jogador_nome: null, jogador_telefone: null, jogador_email: null,
        jogador_loja_id: null, jogador_fingerprint: null,
      }).eq('id', s);
      // unique_violation no UNIQUE(evento,jogo,telefone) parcial: telefone duplicado.
      const rpcCode = (rpcErr as { code?: string }).code;
      const rpcMsg  = (rpcErr as { message?: string }).message ?? '';
      if (rpcCode === '23505' || rpcMsg.includes('unq_jogada_tel_evento_jogo')) {
        throw errConflict(
          'Este telefone já jogou nesta Roleta. Cada celular pode jogar uma vez por evento por jogo.'
        );
      }
      throw new Error(`sortear_e_baixar_estoque: ${rpcErr.message}`);
    }

    await audit(sb, {
      evento_id: sessao.evento_id,
      acao: 'submeter_dados',
      recurso_tipo: 'sessoes_jogo',
      recurso_id: sessao.id,
      detalhes: { jogo: sessao.jogo, fingerprint_prefix: fingerprint.slice(0, 8) },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return jsonOk({ ok: true, mensagem: 'Aguarde, a roleta vai girar no totem!' });
  } catch (err) {
    return jsonErr(err);
  }
});
