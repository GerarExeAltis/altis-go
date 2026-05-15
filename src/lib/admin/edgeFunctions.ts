import { env } from '@/lib/env';

export interface ConvidarOperadorResp {
  user_id: string;
  email: string;
}

/**
 * Chama a Edge Function `convidar-operador` que dispara o invite
 * via Supabase Auth admin. O backend valida que quem esta chamando
 * eh um operador ativo (JWT-Admin elevado).
 *
 * `redirectTo` deve ser a URL absoluta da pagina onde o operador
 * vai cair apos clicar no link do email — pra esta plataforma eh
 * `/redefinir-senha`.
 */
export async function convidarOperador(
  adminJwt: string,
  email: string,
  nome: string,
  redirectTo: string,
): Promise<ConvidarOperadorResp> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/convidar-operador`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${adminJwt}`,
      },
      body: JSON.stringify({ email, nome, redirectTo }),
    },
  );
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `convidar-operador falhou: ${res.status}`);
  }
  return res.json() as Promise<ConvidarOperadorResp>;
}
