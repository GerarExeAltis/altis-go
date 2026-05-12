import { env } from '@/lib/env';

export interface LiberarJogadaResp {
  sessao_id: string;
  token: string;
  expira_em: string;
}

export async function liberarJogada(
  accessToken: string,
  jogo: 'roleta' | 'dados'
): Promise<LiberarJogadaResp> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/liberar-jogada`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ jogo }),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `liberar-jogada falhou: ${res.status}`);
  }
  return res.json() as Promise<LiberarJogadaResp>;
}

export async function iniciarAnimacao(accessToken: string, sessaoId: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/iniciar-animacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ sessao_id: sessaoId }),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `iniciar-animacao falhou: ${res.status}`);
  }
}

export async function concluirAnimacao(accessToken: string, sessaoId: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/concluir-animacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ sessao_id: sessaoId }),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `concluir-animacao falhou: ${res.status}`);
  }
}
