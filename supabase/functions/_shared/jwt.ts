import { SignJWT, jwtVerify, createRemoteJWKSet, joseErrors } from './deps.ts';
import type { JwtSessaoPayload, JogoTipo } from './types.ts';
import { errUnauthorized } from './errors.ts';

const SESSAO_TTL_SECS = 5 * 60;
const ADMIN_TTL_SECS = 30 * 60;

function secretAsKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function getSessaoSecret(): Uint8Array {
  const s = Deno.env.get('SESSAO_JWT_SECRET');
  if (!s || s.length < 32) {
    throw new Error('SESSAO_JWT_SECRET ausente ou < 32 chars');
  }
  return secretAsKey(s);
}

function getSupabaseJwtSecret(): Uint8Array {
  // Local: Supabase CLI auto-injeta SUPABASE_INTERNAL_JWT_SECRET no edge runtime.
  // Prod: setamos JWT_AUTH_SECRET nas secrets do projeto.
  const s = Deno.env.get('SUPABASE_INTERNAL_JWT_SECRET') ?? Deno.env.get('JWT_AUTH_SECRET');
  if (!s || s.length < 32) {
    throw new Error('JWT secret ausente ou < 32 chars (SUPABASE_INTERNAL_JWT_SECRET / JWT_AUTH_SECRET)');
  }
  return secretAsKey(s);
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Assina JWT-Sessão (capability token do QR Code). */
export async function signSessaoToken(
  sessaoId: string,
  eventoId: string,
  jogo: JogoTipo
): Promise<{ token: string; expiraEm: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSAO_TTL_SECS;
  const token = await new SignJWT({
    s: sessaoId,
    e: eventoId,
    g: jogo,
    nonce: randomNonce(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSessaoSecret());
  return { token, expiraEm: new Date(exp * 1000) };
}

/** Valida JWT-Sessão e confirma match com o sessao_id passado na URL. */
export async function verifySessaoToken(
  token: string,
  expectedSessaoId: string
): Promise<JwtSessaoPayload> {
  try {
    const { payload } = await jwtVerify(token, getSessaoSecret(), { algorithms: ['HS256'] });
    const p = payload as unknown as JwtSessaoPayload;
    if (p.s !== expectedSessaoId) {
      throw errUnauthorized('Token não corresponde à sessão');
    }
    return p;
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) throw errUnauthorized('Token expirado');
    if (err instanceof joseErrors.JWSSignatureVerificationFailed)
      throw errUnauthorized('Assinatura inválida');
    if (err instanceof joseErrors.JWTInvalid) throw errUnauthorized('Token malformado');
    throw err;
  }
}

/** Assina JWT-Admin (modo elevado) usando SUPABASE_JWT_SECRET — auth.jwt() vai ler. */
export async function signAdminToken(operadorId: string): Promise<{
  token: string;
  expiraEm: Date;
  jti: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ADMIN_TTL_SECS;
  const jti = randomNonce();
  const token = await new SignJWT({
    sub: operadorId,
    role: 'authenticated',
    aud: 'authenticated',
    admin_elevado: true,
    jti,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSupabaseJwtSecret());
  return { token, expiraEm: new Date(exp * 1000), jti };
}

// JWKS endpoint do Supabase Auth — usado para verificar JWTs ES256 (signing
// keys assimetricas, default em supabase-cli >= 2.x). Mantemos cache na URL
// interna do edge runtime (mais rapida que 127.0.0.1 dentro do container).
function getAuthJwksUrl(): URL {
  const base = Deno.env.get('SUPABASE_URL')
    ?? Deno.env.get('SUPABASE_INTERNAL_API_URL')
    ?? 'http://kong:8000';
  return new URL('/auth/v1/.well-known/jwks.json', base);
}
const remoteJwks = createRemoteJWKSet(getAuthJwksUrl(), {
  cooldownDuration: 30_000,
  timeoutDuration: 5_000,
});

/** Lê o JWT do header Authorization e devolve o sub (operador.id). null se inválido.
 *  Tenta ES256 via JWKS primeiro (Supabase moderno); cai para HS256 com secret
 *  legacy se nao conseguir (compatibilidade com tokens admin elevados que
 *  assinamos internamente).
 */
export async function getOperadorIdFromHeader(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  try {
    const { payload } = await jwtVerify(token, remoteJwks, { algorithms: ['ES256', 'RS256'] });
    return (payload.sub as string | undefined) ?? null;
  } catch (esErr) {
    // Fallback HS256 legacy (JWT-Admin elevado assinado por nos mesmos).
    try {
      const { payload } = await jwtVerify(token, getSupabaseJwtSecret(), { algorithms: ['HS256'] });
      return (payload.sub as string | undefined) ?? null;
    } catch {
      console.warn('[jwt] verificacao falhou (ES256 e HS256):', (esErr as Error).message);
      return null;
    }
  }
}
