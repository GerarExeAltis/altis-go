import { SignJWT } from 'jose';

const SUPABASE_JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
const SESSAO_JWT_SECRET   = new TextEncoder().encode(process.env.SESSAO_JWT_SECRET!);

/** Gera JWT-Operador (assinado com SUPABASE_JWT_SECRET) sem admin_elevado. */
export async function operadorJwt(operadorId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ sub: operadorId, role: 'authenticated', aud: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(SUPABASE_JWT_SECRET);
}

/** Gera JWT-Admin (modo elevado). */
export async function adminJwt(operadorId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    sub: operadorId,
    role: 'authenticated',
    aud: 'authenticated',
    admin_elevado: true,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 1800)
    .sign(SUPABASE_JWT_SECRET);
}

/** Gera JWT-Sessão (capability token). */
export async function sessaoJwt(
  sessaoId: string,
  eventoId: string,
  jogo: 'roleta' | 'dados',
  ttlSecs = 300
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    s: sessaoId,
    e: eventoId,
    g: jogo,
    nonce: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSecs)
    .sign(SESSAO_JWT_SECRET);
}
