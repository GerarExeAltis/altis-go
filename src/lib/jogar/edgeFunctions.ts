import { env } from '@/lib/env';
import type { ObterSessaoResp, SubmeterDadosResp } from './types';

export async function obterSessao(s: string, t: string): Promise<ObterSessaoResp> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/obter-sessao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s, t }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const codigo = (e.codigo as string) ?? 'UNKNOWN';
    throw new Error(`${codigo}|${e.erro ?? 'obter-sessao falhou'}`);
  }
  return res.json() as Promise<ObterSessaoResp>;
}

export interface DadosJogadorInput {
  nome: string;
  telefone: string;
  email: string;
  loja_id: string | null;
}

export async function submeterDados(
  s: string,
  t: string,
  dados: DadosJogadorInput,
  fingerprint: string
): Promise<SubmeterDadosResp> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submeter-dados`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s, t, dados, fingerprint }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${body.codigo ?? 'ERR'}|${body.erro ?? 'submeter-dados falhou'}`);
  }
  return body as SubmeterDadosResp;
}

/** Jogador no celular dispara a animacao da roleta no totem. */
export async function iniciarAnimacaoJogador(s: string, t: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/iniciar-animacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s, t }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${body.codigo ?? 'ERR'}|${body.erro ?? 'iniciar-animacao falhou'}`);
  }
}
