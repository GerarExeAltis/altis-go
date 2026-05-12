# Altis Bet — Plano 2: Edge Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as **7 Edge Functions Deno** que orquestram o fluxo do jogo (validar-senha-admin, liberar-jogada, obter-sessao, submeter-dados, iniciar-animacao, concluir-animacao, processar-imagem), com shared utils tipados, validação rigorosa, auditoria por chamada, e bateria de testes Vitest contra Supabase local — incluindo um teste E2E happy-path completo.

**Architecture:** Frontend nunca acessa banco diretamente — toda mudança de estado passa por Edge Functions. Funções validam JWT (operador, admin-elevado ou capability-token), validam payload com zod, chamam funções PL/pgSQL para mutações atômicas, gravam auditoria, retornam JSON tipado. Testes orquestrados via `supabase functions serve` + Vitest fazendo `fetch()` HTTP real.

**Tech Stack:** Deno (runtime das Edge Functions do Supabase), TypeScript, `npm:@supabase/supabase-js@2`, `npm:jose@5` (JWT), `npm:bcryptjs@2` (bcrypt puro JS), `npm:zod@3` (validação), Vitest (testes integrações HTTP a partir do Node), `supabase functions serve` (hot-reload local).

**Pré-requisitos atendidos no Plano 1:**
- Schema completo + RLS + função `sortear_e_baixar_estoque` + seed com operador dev/senha admin placeholder
- Supabase local rodando via `npm run db:start`
- Tag `plano-1-completo` no git

**Tempo estimado total:** ~8–12 horas se executado sequencialmente.

---

## File structure que este plano cria

```
altis-bet/
├─ package.json                                # MODIFY: deps + scripts
├─ vitest.config.ts                            # NEW
├─ .env.test                                   # NEW (gitignored)
├─ supabase/
│  ├─ config.toml                              # MODIFY (verify_jwt)
│  └─ functions/
│     ├─ _shared/
│     │  ├─ deps.ts                            # imports centralizados
│     │  ├─ types.ts                           # TS interfaces de payload
│     │  ├─ response.ts                        # JSON response + CORS
│     │  ├─ errors.ts                          # AppError tipado
│     │  ├─ jwt.ts                             # sign/verify JWT-Sessão e JWT-Admin
│     │  ├─ validators.ts                      # email, telefone, fingerprint, uuid
│     │  ├─ supabase-client.ts                 # factory service_role
│     │  └─ audit.ts                           # INSERT em auditoria
│     ├─ validar-senha-admin/index.ts          # POST { senha } → JWT-Admin
│     ├─ liberar-jogada/index.ts               # POST { jogo } → { sessao_id, token }
│     ├─ obter-sessao/index.ts                 # POST { s, t } → { sessao, premios, lojas }
│     ├─ submeter-dados/index.ts               # POST { s, t, dados, fingerprint } → { ok, mensagem }
│     ├─ iniciar-animacao/index.ts             # POST { sessao_id } → { ok }
│     ├─ concluir-animacao/index.ts            # POST { sessao_id } → { ok }
│     └─ processar-imagem/index.ts             # POST FormData → { foto_path }
├─ tests/
│  └─ edge-functions/
│     ├─ helpers/
│     │  ├─ supabase.ts                        # createClient (anon e service)
│     │  ├─ fixtures.ts                        # criar/limpar evento/operador/sessão
│     │  ├─ jwt.ts                             # gerar JWT-Sessão e JWT-Operador para testes
│     │  └─ functions.ts                       # wrapper fetch tipado
│     ├─ validar-senha-admin.test.ts
│     ├─ liberar-jogada.test.ts
│     ├─ obter-sessao.test.ts
│     ├─ submeter-dados.test.ts
│     ├─ iniciar-animacao.test.ts
│     ├─ concluir-animacao.test.ts
│     ├─ processar-imagem.test.ts
│     └─ happy-path.test.ts                    # E2E
├─ supabase/migrations/
│  └─ 20260512100001_senha_admin_helper.sql    # NEW: função para CLI gerar bcrypt
└─ .github/workflows/
   └─ ci-functions.yml                          # NEW
```

---

## Convenções deste plano

- **TDD obrigatório**: para cada Edge Function, o teste Vitest é escrito **antes** e deve falhar primeiro (RED), depois implementamos (GREEN), commitamos.
- **Commits em conventional commits** (`feat`, `test`, `chore`, `fix`).
- **Path da Supabase CLI no host:** `C:/Users/Altis/scoop/shims/supabase.exe` (já existe; só o Bash do Claude não a tem no PATH — em uma sessão normal o usuário usa `supabase` direto).
- Onde o plano diz **"Run"**, use o comando exato; em uma máquina Windows com Supabase no PATH é só rodar normalmente.
- **Edge Functions são servidas em `http://127.0.0.1:54321/functions/v1/<nome>`** quando rodando `supabase functions serve`.
- **Testes assumem `supabase functions serve` rodando em paralelo.** Vitest usa `globalSetup` para garantir.

---

## Task 1 — Configurar dependências e Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `.env.test`
- Modify: `.gitignore` (já ignora `.env.test`? confirmar)

- [ ] **Step 1.1: Adicionar dependências ao `package.json`**

Substituir conteúdo de `package.json` por (mantém scripts existentes do Plano 1 e adiciona Vitest + supabase-js):

```json
{
  "name": "altis-bet",
  "version": "0.2.0",
  "private": true,
  "description": "Altis Bet — plataforma de jogos com premiação",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status",
    "test:db": "supabase test db",
    "functions:serve": "supabase functions serve --no-verify-jwt",
    "test:functions": "vitest run tests/edge-functions",
    "test:functions:watch": "vitest tests/edge-functions",
    "test": "npm run test:db && npm run test:functions",
    "lint": "echo 'lint will be added in Plano 4'",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@vitest/ui": "^1.6.0",
    "@supabase/supabase-js": "^2.45.0",
    "jose": "^5.9.0",
    "dotenv": "^16.4.0"
  }
}
```

`--no-verify-jwt` desabilita o check automático do JWT do Supabase nas Edge Functions — nós faremos validação custom (operador, admin-elevado, capability-token) dentro de cada handler.

- [ ] **Step 1.2: Criar `.env.test` (gitignored)**

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
SESSAO_JWT_SECRET=test-sessao-secret-with-at-least-32-characters-aaa
FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1
```

Esses são os defaults do `supabase start` local. Em produção viram secrets do GH Actions / Supabase Vault.

- [ ] **Step 1.3: Confirmar/atualizar `.gitignore`**

`.env.test` deve ser ignorado. O `.gitignore` do Plano 1 já tem `.env.*.local` mas NÃO ignora `.env.test`. Adicionar:

Modificar `.gitignore`, achar a seção "Ambiente" e substituir:
```gitignore
# Ambiente
.env
.env.local
.env.*.local
!.env.local.example
```
por:
```gitignore
# Ambiente
.env
.env.local
.env.test
.env.*.local
!.env.local.example
```

- [ ] **Step 1.4: Criar `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/edge-functions/helpers/setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    include: ['tests/edge-functions/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
```

`singleFork: true` força execução sequencial — Edge Functions compartilham estado de DB, então paralelismo causaria flakes.

- [ ] **Step 1.5: Criar pasta `tests/edge-functions/helpers/` e setup placeholder**

Criar `tests/edge-functions/helpers/setup.ts`:

```typescript
import { config } from 'dotenv';
config({ path: '.env.test' });

if (!process.env.SUPABASE_URL) {
  throw new Error(
    'tests/edge-functions/helpers/setup.ts: SUPABASE_URL não definido. ' +
      'Copie .env.test do template ou rode `supabase status` para pegar valores.'
  );
}
```

- [ ] **Step 1.6: Instalar e validar**

```bash
npm install
npm run typecheck
```

Expected: `typecheck` exit 0 (ainda só o `src/_placeholder.ts` do Plano 1).

- [ ] **Step 1.7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .gitignore tests/edge-functions/helpers/setup.ts
git commit -m "chore: setup vitest, supabase-js, jose deps for edge function tests"
```

---

## Task 2 — Migration helper: gerar bcrypt no DB

**Files:**
- Create: `supabase/migrations/20260512100001_senha_admin_helper.sql`

Razão: a CLI do Plano 3 precisa gerar um bcrypt da senha admin e gravar em `admin_credenciais`. Para evitar dependência de bcrypt no Node (CLI), expomos uma função PL/pgSQL com `pgcrypto` que faz o hashing server-side, callable somente por `service_role`.

- [ ] **Step 2.1: Criar a migration**

```sql
-- 20260512100001_senha_admin_helper.sql
-- Helper RPC para gravar/trocar a senha admin com bcrypt server-side.
-- Usa pgcrypto.crypt(). So executavel por service_role.

CREATE OR REPLACE FUNCTION private.definir_senha_admin(p_senha TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF length(p_senha) < 8 THEN
    RAISE EXCEPTION 'Senha admin precisa de ao menos 8 caracteres'
      USING ERRCODE = 'P0001';
  END IF;

  v_hash := extensions.crypt(p_senha, extensions.gen_salt('bf', 12));

  INSERT INTO public.admin_credenciais (id, senha_hash)
       VALUES (1, v_hash)
  ON CONFLICT (id) DO UPDATE
    SET senha_hash    = EXCLUDED.senha_hash,
        atualizada_em = NOW();
END $$;

REVOKE EXECUTE ON FUNCTION private.definir_senha_admin(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.definir_senha_admin(TEXT) TO service_role;

-- Helper para comparar senha em runtime (usado pela Edge Function validar-senha-admin).
CREATE OR REPLACE FUNCTION private.verificar_senha_admin(p_senha TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_credenciais
     WHERE id = 1
       AND senha_hash = extensions.crypt(p_senha, senha_hash)
  );
$$;

REVOKE EXECUTE ON FUNCTION private.verificar_senha_admin(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.verificar_senha_admin(TEXT) TO service_role;
```

`gen_salt('bf', 12)` = blowfish cost 12 (mesmo padrão bcrypt). `crypt(senha, hash)` retorna o próprio hash se a senha bate.

- [ ] **Step 2.2: Atualizar seed.sql para usar `private.definir_senha_admin`**

Modificar `supabase/seed.sql`: substituir o INSERT direto em `admin_credenciais` por uma chamada à função (assim o hash placeholder vira um hash real de uma senha conhecida `'admin123'`).

Localizar:
```sql
-- Hash placeholder de senha admin (sera substituido pelo Plano 3 CLI)
INSERT INTO public.admin_credenciais (id, senha_hash)
VALUES (1, '$2a$12$8eFb1JLZBJxR7VqMHC4y9OZsLb2yVqVO7TpvLNQXDOJ4cVCpJZb3y')
ON CONFLICT (id) DO NOTHING;
```

Substituir por:
```sql
-- Define senha admin de DEV via helper PL/pgSQL (bcrypt cost 12).
-- Plano 3 (CLI) sobrescreve com senha real no bootstrap interativo.
SELECT private.definir_senha_admin('admin123');
```

- [ ] **Step 2.3: Aplicar migration + rodar testes pgTAP**

```bash
supabase db reset
supabase test db
```

Expected: 83/83 ainda passam (migration nova é puro adicionar — não quebra nada existente).

- [ ] **Step 2.4: Validar bcrypt no banco**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT private.verificar_senha_admin('admin123');"
```

Expected: `t` (true).

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT private.verificar_senha_admin('senha-errada');"
```

Expected: `f` (false).

- [ ] **Step 2.5: Commit**

```bash
git add supabase/migrations/20260512100001_senha_admin_helper.sql supabase/seed.sql
git commit -m "feat(db): add private.definir_senha_admin and verificar_senha_admin helpers"
```

---

## Task 3 — Shared utils: `deps.ts` + `types.ts`

**Files:**
- Create: `supabase/functions/_shared/deps.ts`
- Create: `supabase/functions/_shared/types.ts`

Edge Functions Deno usam `npm:` specifier para importar do npm. Centralizamos os imports em `deps.ts` para versionar consistente.

- [ ] **Step 3.1: Criar `supabase/functions/_shared/deps.ts`**

```typescript
// Imports compartilhados — versionar aqui é mais fácil que em cada handler.
export { createClient } from 'npm:@supabase/supabase-js@2.45.0';
export type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.0';

export { SignJWT, jwtVerify, errors as joseErrors } from 'npm:jose@5.9.0';
export type { JWTPayload } from 'npm:jose@5.9.0';

export { z } from 'npm:zod@3.23.0';
```

- [ ] **Step 3.2: Criar `supabase/functions/_shared/types.ts`**

```typescript
// Tipos do dominio compartilhados entre Edge Functions.

export type JogoTipo = 'roleta' | 'dados';

export type SessaoStatus =
  | 'aguardando_celular'
  | 'aguardando_dados'
  | 'pronta_para_girar'
  | 'girando'
  | 'finalizada'
  | 'expirada'
  | 'cancelada';

export interface JwtSessaoPayload {
  s: string;       // sessao_id
  e: string;       // evento_id
  g: JogoTipo;     // jogo
  iat: number;
  exp: number;
  nonce: string;
}

export interface JwtAdminPayload {
  sub: string;            // operador.id
  role: 'authenticated';
  aud: 'authenticated';
  iat: number;
  exp: number;
  admin_elevado: true;
  jti: string;
}

export interface DadosJogador {
  nome: string;
  telefone: string;
  email: string;
  loja_id?: string | null;
}

export interface PremioPublico {
  id: string;
  nome: string;
  cor_hex: string | null;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
}

export interface LojaPublica {
  id: string;
  nome: string;
  cidade: string | null;
}
```

- [ ] **Step 3.3: Commit**

```bash
git add supabase/functions/_shared/deps.ts supabase/functions/_shared/types.ts
git commit -m "feat(fn): add shared deps and domain types"
```

---

## Task 4 — Shared utils: `response.ts` + `errors.ts`

**Files:**
- Create: `supabase/functions/_shared/errors.ts`
- Create: `supabase/functions/_shared/response.ts`

- [ ] **Step 4.1: Criar `errors.ts`**

```typescript
// Erros tipados que viram HTTP responses na borda.

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly detalhes?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errBadRequest = (msg: string, det?: Record<string, unknown>) =>
  new AppError(400, 'BAD_REQUEST', msg, det);

export const errUnauthorized = (msg = 'Não autorizado') =>
  new AppError(401, 'UNAUTHORIZED', msg);

export const errForbidden = (msg = 'Acesso negado') =>
  new AppError(403, 'FORBIDDEN', msg);

export const errNotFound = (msg = 'Não encontrado') =>
  new AppError(404, 'NOT_FOUND', msg);

export const errConflict = (msg: string, det?: Record<string, unknown>) =>
  new AppError(409, 'CONFLICT', msg, det);

export const errTooManyRequests = (msg = 'Muitas tentativas') =>
  new AppError(429, 'TOO_MANY_REQUESTS', msg);

export const errInternal = (msg = 'Erro interno') =>
  new AppError(500, 'INTERNAL', msg);
```

- [ ] **Step 4.2: Criar `response.ts`**

```typescript
import { AppError } from './errors.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonOk<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function jsonErr(err: unknown): Response {
  if (err instanceof AppError) {
    return new Response(
      JSON.stringify({ erro: err.message, codigo: err.code, ...(err.detalhes ?? {}) }),
      {
        status: err.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
  console.error('[unhandled]', err);
  const msg = err instanceof Error ? err.message : 'Erro desconhecido';
  return new Response(JSON.stringify({ erro: 'Erro interno', codigo: 'INTERNAL', detalhe: msg }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  return null;
}
```

- [ ] **Step 4.3: Commit**

```bash
git add supabase/functions/_shared/errors.ts supabase/functions/_shared/response.ts
git commit -m "feat(fn): add AppError, JSON response helpers and CORS preflight"
```

---

## Task 5 — Shared utils: `jwt.ts` (sign + verify)

**Files:**
- Create: `supabase/functions/_shared/jwt.ts`

Implementa assinatura e verificação dos 2 JWTs custom:
- **JWT-Sessão** (capability token do jogador) — segredo `SESSAO_JWT_SECRET`, TTL 5min
- **JWT-Admin** (modo elevado) — segredo `SUPABASE_JWT_SECRET`, TTL 30min, com claim `admin_elevado=true`

- [ ] **Step 5.1: Criar `supabase/functions/_shared/jwt.ts`**

```typescript
import { SignJWT, jwtVerify, joseErrors } from './deps.ts';
import type { JwtSessaoPayload, JwtAdminPayload, JogoTipo } from './types.ts';
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
  const s = Deno.env.get('SUPABASE_JWT_SECRET');
  if (!s || s.length < 32) {
    throw new Error('SUPABASE_JWT_SECRET ausente ou < 32 chars');
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

/** Lê o JWT do header Authorization e devolve o sub (operador.id). null se inválido. */
export async function getOperadorIdFromHeader(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, getSupabaseJwtSecret(), { algorithms: ['HS256'] });
    return (payload.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5.2: Commit (testes vêm na próxima task)**

```bash
git add supabase/functions/_shared/jwt.ts
git commit -m "feat(fn): add jwt helpers (sign/verify session + admin tokens)"
```

---

## Task 6 — Shared utils: `validators.ts`

**Files:**
- Create: `supabase/functions/_shared/validators.ts`

Validação centralizada com zod. Telefone brasileiro com DDD válido. Email regex. UUID v4.

- [ ] **Step 6.1: Criar `supabase/functions/_shared/validators.ts`**

```typescript
import { z } from './deps.ts';
import { errBadRequest } from './errors.ts';

// DDDs validos no Brasil (lista oficial Anatel).
const DDDS_VALIDOS = new Set([
  '11','12','13','14','15','16','17','18','19',  // SP
  '21','22','24',                                // RJ
  '27','28',                                     // ES
  '31','32','33','34','35','37','38',            // MG
  '41','42','43','44','45','46',                 // PR
  '47','48','49',                                // SC
  '51','53','54','55',                           // RS
  '61',                                          // DF
  '62','64',                                     // GO
  '63',                                          // TO
  '65','66',                                     // MT
  '67',                                          // MS
  '68',                                          // AC
  '69',                                          // RO
  '71','73','74','75','77',                      // BA
  '79',                                          // SE
  '81','87',                                     // PE
  '82',                                          // AL
  '83',                                          // PB
  '84',                                          // RN
  '85','88',                                     // CE
  '86','89',                                     // PI
  '91','93','94',                                // PA
  '92','97',                                     // AM
  '95',                                          // RR
  '96',                                          // AP
  '98','99',                                     // MA
]);

/**
 * Telefone brasileiro: 11 dígitos, começa com 9, DDD válido.
 * Aceita só dígitos no input — frontend remove máscara antes de enviar.
 */
export const telefoneSchema = z
  .string()
  .regex(/^\d{11}$/, 'telefone precisa de 11 dígitos')
  .refine((v) => DDDS_VALIDOS.has(v.slice(0, 2)), {
    message: 'DDD inválido',
  })
  .refine((v) => v[2] === '9', { message: 'celular precisa começar com 9 após DDD' });

export const emailSchema = z
  .string()
  .min(3)
  .max(120)
  .email('email inválido');

export const nomeSchema = z
  .string()
  .trim()
  .min(3, 'nome precisa de ao menos 3 letras')
  .max(80)
  // Sem caracteres de controle nem < > para reduzir vetor de XSS no banner.
  .regex(/^[^\x00-\x1f<>]+$/, 'nome contém caracteres inválidos');

export const uuidSchema = z.string().uuid('uuid inválido');

export const fingerprintSchema = z
  .string()
  .regex(/^[a-f0-9]{16,128}$/i, 'fingerprint inválido (esperado hex 16-128)');

export const dadosJogadorSchema = z.object({
  nome: nomeSchema,
  telefone: telefoneSchema,
  email: emailSchema,
  loja_id: uuidSchema.nullable().optional(),
});

export type DadosJogadorValidado = z.infer<typeof dadosJogadorSchema>;

/** Valida payload genérico ou lança errBadRequest com detalhes do zod. */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw errBadRequest('Payload inválido', {
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  return result.data;
}
```

- [ ] **Step 6.2: Commit**

```bash
git add supabase/functions/_shared/validators.ts
git commit -m "feat(fn): add zod-based validators (telefone DDD, email, fingerprint, payload parser)"
```

---

## Task 7 — Shared utils: `supabase-client.ts` + `audit.ts`

**Files:**
- Create: `supabase/functions/_shared/supabase-client.ts`
- Create: `supabase/functions/_shared/audit.ts`

- [ ] **Step 7.1: Criar `supabase-client.ts`**

```typescript
import { createClient } from './deps.ts';
import type { SupabaseClient } from './deps.ts';

/**
 * Client com service_role — bypassa RLS. Usar apenas em Edge Functions
 * que validam autorização explicitamente antes.
 */
export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 7.2: Criar `audit.ts`**

```typescript
import type { SupabaseClient } from './deps.ts';

export interface AuditEntry {
  evento_id?: string | null;
  acao: string;                    // 'liberar_jogada', 'sortear', 'admin_login', ...
  ator?: string | null;            // operador.id (uuid)
  recurso_tipo?: string | null;
  recurso_id?: string | null;
  detalhes?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
}

/** Insere um registro de auditoria. Não bloqueia; loga erro se falhar. */
export async function audit(
  client: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  const { error } = await client.from('auditoria').insert({
    evento_id:    entry.evento_id    ?? null,
    acao:         entry.acao,
    ator:         entry.ator         ?? null,
    recurso_tipo: entry.recurso_tipo ?? null,
    recurso_id:   entry.recurso_id   ?? null,
    detalhes:     entry.detalhes     ?? {},
    ip:           entry.ip           ?? null,
    user_agent:   entry.user_agent   ?? null,
  });
  if (error) {
    console.error('[audit] falha ao inserir:', error);
  }
}

/** Extrai IP e User-Agent do Request para passar ao audit. */
export function extractClientMeta(req: Request): { ip: string | null; user_agent: string | null } {
  const ua = req.headers.get('User-Agent');
  // Em Supabase Edge Functions o IP real vem em x-forwarded-for.
  const xff = req.headers.get('X-Forwarded-For');
  const ip = xff ? xff.split(',')[0].trim() : null;
  return { ip, user_agent: ua };
}
```

- [ ] **Step 7.3: Commit**

```bash
git add supabase/functions/_shared/supabase-client.ts supabase/functions/_shared/audit.ts
git commit -m "feat(fn): add service_role client factory and audit helper"
```

---

## Task 8 — Test helpers (Vitest infra)

**Files:**
- Create: `tests/edge-functions/helpers/supabase.ts`
- Create: `tests/edge-functions/helpers/jwt.ts`
- Create: `tests/edge-functions/helpers/fixtures.ts`
- Create: `tests/edge-functions/helpers/functions.ts`

- [ ] **Step 8.1: Criar `tests/edge-functions/helpers/supabase.ts`**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL  = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function service(): SupabaseClient {
  return createClient(URL, SVC, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anon(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 8.2: Criar `tests/edge-functions/helpers/jwt.ts`**

```typescript
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
    sub: operadorId, role: 'authenticated', aud: 'authenticated', admin_elevado: true,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 1800)
    .sign(SUPABASE_JWT_SECRET);
}

/** Gera JWT-Sessão (capability token). */
export async function sessaoJwt(
  sessaoId: string, eventoId: string, jogo: 'roleta' | 'dados', ttlSecs = 300
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ s: sessaoId, e: eventoId, g: jogo, nonce: crypto.randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSecs)
    .sign(SESSAO_JWT_SECRET);
}
```

- [ ] **Step 8.3: Criar `tests/edge-functions/helpers/fixtures.ts`**

```typescript
import { service } from './supabase';
import { randomUUID } from 'node:crypto';

const sb = service();

/** Cria evento de teste e retorna ID. Status = 'rascunho' para não conflitar com seed ativo. */
export async function criarEventoTest(): Promise<{ eventoId: string; operadorId: string }> {
  const operadorId = '00000000-0000-0000-0000-000000000001'; // dev do seed
  const eventoId = randomUUID();
  const { error } = await sb.from('eventos').insert({
    id: eventoId,
    nome: `Test ${eventoId.slice(0, 8)}`,
    data_inicio: new Date().toISOString().slice(0, 10),
    data_fim: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    status: 'rascunho',
    criado_por: operadorId,
  });
  if (error) throw new Error(`criarEventoTest: ${error.message}`);
  return { eventoId, operadorId };
}

export async function criarPremioTest(eventoId: string, opts: {
  peso?: number; estoque?: number; real?: boolean; nome?: string; ordem?: number;
} = {}): Promise<string> {
  const id = randomUUID();
  const { error } = await sb.from('premios').insert({
    id,
    evento_id: eventoId,
    nome: opts.nome ?? `Premio ${id.slice(0,8)}`,
    peso_base: opts.peso ?? 1,
    estoque_inicial: opts.estoque ?? 100,
    estoque_atual: opts.estoque ?? 100,
    ordem_roleta: opts.ordem ?? 1,
    e_premio_real: opts.real ?? true,
    cor_hex: '#4afad4',
  });
  if (error) throw new Error(`criarPremioTest: ${error.message}`);
  return id;
}

export async function criarSessaoTest(
  eventoId: string,
  operadorId: string,
  status: string = 'aguardando_celular'
): Promise<string> {
  const id = randomUUID();
  const { error } = await sb.from('sessoes_jogo').insert({
    id, evento_id: eventoId, jogo: 'roleta', status, liberada_por: operadorId,
  });
  if (error) throw new Error(`criarSessaoTest: ${error.message}`);
  return id;
}

export async function limparEvento(eventoId: string): Promise<void> {
  await sb.from('eventos').delete().eq('id', eventoId);
  // ON DELETE CASCADE limpa premios, sessoes_jogo, ganhadores
}
```

- [ ] **Step 8.4: Criar `tests/edge-functions/helpers/functions.ts`**

```typescript
const BASE = process.env.FUNCTIONS_URL!;

export interface FnResponse<T> {
  ok: boolean;
  status: number;
  body: T;
}

export async function callFn<T = unknown>(
  name: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<FnResponse<T>> {
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed as T };
}
```

- [ ] **Step 8.5: Commit**

```bash
git add tests/edge-functions/helpers/
git commit -m "test(fn): scaffold vitest helpers (supabase clients, jwt signers, fixtures, fetch wrapper)"
```

---

## Task 9 — Edge Function: `validar-senha-admin` (TDD)

**Files:**
- Create: `tests/edge-functions/validar-senha-admin.test.ts`
- Create: `supabase/functions/validar-senha-admin/index.ts`

A função recebe `{ senha }`, busca operador no header, valida bcrypt via `private.verificar_senha_admin`, conta tentativas falhas para rate limit (5/IP/10min), retorna `{ token, exp }` ou 401/429.

- [ ] **Step 9.1: Escrever o teste (RED)**

`tests/edge-functions/validar-senha-admin.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';

const OPERADOR_ID = '00000000-0000-0000-0000-000000000001'; // dev do seed
const SENHA_OK    = 'admin123';                              // seed
const SENHA_RUIM  = 'errada123';

let opJwt: string;
beforeAll(async () => { opJwt = await operadorJwt(OPERADOR_ID); });

describe('validar-senha-admin', () => {
  it('senha correta retorna JWT-Admin com claim admin_elevado', async () => {
    const r = await callFn<{ token: string; exp: number }>(
      'validar-senha-admin',
      { senha: SENHA_OK },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(200);
    expect(r.body.token).toBeTypeOf('string');
    expect(r.body.exp).toBeTypeOf('number');
    // Decodifica payload (parte do meio, base64url)
    const payload = JSON.parse(
      Buffer.from(r.body.token.split('.')[1], 'base64url').toString()
    );
    expect(payload.admin_elevado).toBe(true);
    expect(payload.sub).toBe(OPERADOR_ID);
  });

  it('senha errada retorna 401', async () => {
    const r = await callFn(
      'validar-senha-admin',
      { senha: SENHA_RUIM },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(401);
  });

  it('payload sem senha retorna 400', async () => {
    const r = await callFn(
      'validar-senha-admin',
      {},
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(400);
  });

  it('sem JWT-Operador retorna 401', async () => {
    const r = await callFn('validar-senha-admin', { senha: SENHA_OK });
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 9.2: Rodar o teste — deve FALHAR (a função ainda não existe)**

Em um terminal: `supabase functions serve --no-verify-jwt`
Em outro terminal:
```bash
npm run test:functions -- validar-senha-admin
```
Expected: 4 testes falhando, com erros tipo `404` ou `connection refused`.

- [ ] **Step 9.3: Implementar a função**

`supabase/functions/validar-senha-admin/index.ts`:

```typescript
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
          acao: 'admin_login_bloqueado', ator: operadorId,
          ip: meta.ip, user_agent: meta.user_agent,
          detalhes: { tentativas: count },
        });
        throw errTooManyRequests('Muitas tentativas falhas. Tente novamente em 30 minutos.');
      }
    }

    // Validar senha via função SECURITY DEFINER (bcrypt server-side).
    const { data: ok, error: rpcErr } = await sb.schema('private')
      .rpc('verificar_senha_admin', { p_senha: senha });
    if (rpcErr) throw new Error(`verificar_senha_admin RPC: ${rpcErr.message}`);

    if (!ok) {
      await audit(sb, {
        acao: 'admin_login_falhou', ator: operadorId,
        ip: meta.ip, user_agent: meta.user_agent,
      });
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
      throw errUnauthorized('Senha inválida');
    }

    const { token, expiraEm, jti } = await signAdminToken(operadorId);
    await audit(sb, {
      acao: 'admin_login', ator: operadorId,
      ip: meta.ip, user_agent: meta.user_agent,
      detalhes: { jti },
    });

    return jsonOk({ token, exp: Math.floor(expiraEm.getTime() / 1000) });
  } catch (err) {
    return jsonErr(err);
  }
});
```

- [ ] **Step 9.4: Rodar o teste — deve PASSAR (GREEN)**

```bash
npm run test:functions -- validar-senha-admin
```
Expected: 4 testes passam.

Se o teste de "muitas tentativas" influenciar a estabilidade (auditoria persistente), garantir que cada `it()` usa IP virtual diferente (não setamos X-Forwarded-For nos testes, então o IP nos testes fica `null` e não dispara rate limit — OK).

- [ ] **Step 9.5: Commit**

```bash
git add supabase/functions/validar-senha-admin/ tests/edge-functions/validar-senha-admin.test.ts
git commit -m "feat(fn): add validar-senha-admin with bcrypt + rate limit + audit"
```

---

## Task 10 — Edge Function: `liberar-jogada` (TDD)

**Files:**
- Create: `tests/edge-functions/liberar-jogada.test.ts`
- Create: `supabase/functions/liberar-jogada/index.ts`

Recebe `{ jogo: 'roleta' | 'dados' }`. Busca evento ativo. Cria sessão em `aguardando_celular`. Gera JWT-Sessão. Retorna `{ sessao_id, token, expira_em }`. Grava auditoria.

- [ ] **Step 10.1: Escrever o teste**

`tests/edge-functions/liberar-jogada.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, limparEvento } from './helpers/fixtures';

const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_DEMO  = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb'; // ativo no seed

let opJwt: string;
let eventoExtra: string;
const sb = service();

beforeAll(async () => {
  opJwt = await operadorJwt(OPERADOR_ID);
  const { eventoId } = await criarEventoTest();
  eventoExtra = eventoId;
});

afterAll(async () => { await limparEvento(eventoExtra); });

describe('liberar-jogada', () => {
  it('cria sessão em aguardando_celular e retorna JWT-Sessão', async () => {
    const r = await callFn<{ sessao_id: string; token: string; expira_em: string }>(
      'liberar-jogada',
      { jogo: 'roleta' },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(200);
    expect(r.body.sessao_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.body.token.split('.')).toHaveLength(3);
    expect(new Date(r.body.expira_em).getTime()).toBeGreaterThan(Date.now());

    const { data } = await sb.from('sessoes_jogo')
      .select('status, evento_id, jogo, liberada_por')
      .eq('id', r.body.sessao_id).single();
    expect(data?.status).toBe('aguardando_celular');
    expect(data?.evento_id).toBe(EVENTO_DEMO);
    expect(data?.jogo).toBe('roleta');
    expect(data?.liberada_por).toBe(OPERADOR_ID);
  });

  it('falha sem JWT-Operador', async () => {
    const r = await callFn('liberar-jogada', { jogo: 'roleta' });
    expect(r.status).toBe(401);
  });

  it('falha com jogo inválido', async () => {
    const r = await callFn(
      'liberar-jogada',
      { jogo: 'cartas' },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(400);
  });

  it('grava auditoria com acao=liberar_jogada', async () => {
    const r = await callFn<{ sessao_id: string }>(
      'liberar-jogada',
      { jogo: 'roleta' },
      { Authorization: `Bearer ${opJwt}` }
    );
    expect(r.status).toBe(200);
    const { data } = await sb.from('auditoria')
      .select('acao, ator, recurso_id')
      .eq('recurso_id', r.body.sessao_id).single();
    expect(data?.acao).toBe('liberar_jogada');
    expect(data?.ator).toBe(OPERADOR_ID);
  });
});
```

- [ ] **Step 10.2: Rodar — RED**

```bash
npm run test:functions -- liberar-jogada
```
Expected: 4 failing.

- [ ] **Step 10.3: Implementar**

`supabase/functions/liberar-jogada/index.ts`:

```typescript
import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errUnauthorized, errConflict } from '../_shared/errors.ts';
import { parseBody } from '../_shared/validators.ts';
import { signSessaoToken, getOperadorIdFromHeader } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { audit, extractClientMeta } from '../_shared/audit.ts';

const bodySchema = z.object({
  jogo: z.enum(['roleta', 'dados']),
});

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const operadorId = await getOperadorIdFromHeader(req);
    if (!operadorId) throw errUnauthorized('JWT-Operador ausente ou inválido');

    const { jogo } = parseBody(bodySchema, await req.json());
    const sb = getServiceClient();
    const meta = extractClientMeta(req);

    const { data: evento, error: evErr } = await sb
      .from('eventos')
      .select('id')
      .eq('status', 'ativo')
      .maybeSingle();
    if (evErr) throw new Error(`select evento ativo: ${evErr.message}`);
    if (!evento) throw errConflict('Nenhum evento ativo no momento');

    const { data: sessao, error: sErr } = await sb
      .from('sessoes_jogo')
      .insert({
        evento_id: evento.id,
        jogo,
        status: 'aguardando_celular',
        liberada_por: operadorId,
      })
      .select('id, evento_id')
      .single();
    if (sErr || !sessao) throw new Error(`insert sessao: ${sErr?.message}`);

    const { token, expiraEm } = await signSessaoToken(sessao.id, sessao.evento_id, jogo);

    await audit(sb, {
      evento_id: sessao.evento_id,
      acao: 'liberar_jogada',
      ator: operadorId,
      recurso_tipo: 'sessoes_jogo',
      recurso_id: sessao.id,
      detalhes: { jogo },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return jsonOk({
      sessao_id: sessao.id,
      token,
      expira_em: expiraEm.toISOString(),
    });
  } catch (err) {
    return jsonErr(err);
  }
});
```

- [ ] **Step 10.4: Rodar — GREEN**

```bash
npm run test:functions -- liberar-jogada
```
Expected: 4 passing.

- [ ] **Step 10.5: Commit**

```bash
git add supabase/functions/liberar-jogada/ tests/edge-functions/liberar-jogada.test.ts
git commit -m "feat(fn): add liberar-jogada (creates session + capability token)"
```

---

## Task 11 — Edge Function: `obter-sessao` (TDD)

**Files:**
- Create: `tests/edge-functions/obter-sessao.test.ts`
- Create: `supabase/functions/obter-sessao/index.ts`

Recebe `{ s, t }`. Valida JWT-Sessão. Lê sessão, se `aguardando_celular` muda para `aguardando_dados`. Retorna sessão + prêmios visíveis (sem dados sensíveis) + lojas ativas.

- [ ] **Step 11.1: Escrever o teste**

`tests/edge-functions/obter-sessao.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { sessaoJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, criarPremioTest, criarSessaoTest, limparEvento } from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  await criarPremioTest(eventoId, { nome: 'Vale', peso: 1, ordem: 1 });
  await criarPremioTest(eventoId, { nome: 'Não foi', peso: 30, estoque: 0, real: false, ordem: 2 });
});

afterAll(async () => { await limparEvento(eventoId); });

describe('obter-sessao', () => {
  it('token válido + sessao aguardando_celular -> retorna premios e muda status', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const token = await sessaoJwt(sid, eventoId, 'roleta');

    const r = await callFn<any>('obter-sessao', { s: sid, t: token });
    expect(r.status).toBe(200);
    expect(r.body.sessao.id).toBe(sid);
    expect(Array.isArray(r.body.premios)).toBe(true);
    expect(r.body.premios.length).toBe(2);
    expect(r.body.premios[0]).toMatchObject({ nome: 'Vale', ordem_roleta: 1 });

    const { data } = await sb.from('sessoes_jogo')
      .select('status').eq('id', sid).single();
    expect(data?.status).toBe('aguardando_dados');
  });

  it('token expirado -> 401', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const token = await sessaoJwt(sid, eventoId, 'roleta', -1); // já vencido
    const r = await callFn('obter-sessao', { s: sid, t: token });
    expect(r.status).toBe(401);
  });

  it('token de outra sessão -> 401', async () => {
    const sidReal = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const sidOutra = '11111111-2222-3333-4444-555555555555';
    const token = await sessaoJwt(sidOutra, eventoId, 'roleta');
    const r = await callFn('obter-sessao', { s: sidReal, t: token });
    expect(r.status).toBe(401);
  });

  it('sessão em status errado -> 409', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'finalizada');
    const token = await sessaoJwt(sid, eventoId, 'roleta');
    const r = await callFn('obter-sessao', { s: sid, t: token });
    expect(r.status).toBe(409);
  });
});
```

- [ ] **Step 11.2: RED**

```bash
npm run test:functions -- obter-sessao
```
Expected: 4 failing.

- [ ] **Step 11.3: Implementar**

`supabase/functions/obter-sessao/index.ts`:

```typescript
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

    // Transita aguardando_celular -> aguardando_dados (idempotente).
    if (sessao.status === 'aguardando_celular') {
      const { error: uErr } = await sb
        .from('sessoes_jogo')
        .update({ status: 'aguardando_dados' })
        .eq('id', s)
        .eq('status', 'aguardando_celular');
      if (uErr) throw new Error(`update status: ${uErr.message}`);
    }

    const [{ data: premios }, { data: lojas }] = await Promise.all([
      sb.from('premios')
        .select('id, nome, cor_hex, foto_path, ordem_roleta, e_premio_real')
        .eq('evento_id', sessao.evento_id)
        .order('ordem_roleta', { ascending: true }),
      sb.from('lojas')
        .select('id, nome, cidade')
        .eq('ativa', true)
        .order('nome', { ascending: true }),
    ]);

    return jsonOk({
      sessao: { id: sessao.id, jogo: sessao.jogo, expira_em: sessao.expira_em },
      premios: premios ?? [],
      lojas: lojas ?? [],
    });
  } catch (err) {
    return jsonErr(err);
  }
});
```

- [ ] **Step 11.4: GREEN**

```bash
npm run test:functions -- obter-sessao
```
Expected: 4 passing.

- [ ] **Step 11.5: Commit**

```bash
git add supabase/functions/obter-sessao/ tests/edge-functions/obter-sessao.test.ts
git commit -m "feat(fn): add obter-sessao (validates token, transitions status, returns premios/lojas)"
```

---

## Task 12 — Edge Function: `submeter-dados` (TDD)

**Files:**
- Create: `tests/edge-functions/submeter-dados.test.ts`
- Create: `supabase/functions/submeter-dados/index.ts`

Core do fluxo. Valida JWT-Sessão. Valida payload (nome, telefone, email, loja opcional, fingerprint). Checa blacklist. Atualiza sessão com dados. Chama `sortear_e_baixar_estoque`. Retorna `{ ok, mensagem }`.

- [ ] **Step 12.1: Escrever o teste**

`tests/edge-functions/submeter-dados.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { sessaoJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, criarPremioTest, criarSessaoTest, limparEvento } from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  await criarPremioTest(eventoId, { nome: 'Vale', peso: 1, estoque: 10, ordem: 1, real: true });
  await criarPremioTest(eventoId, { nome: 'Não foi', peso: 30, estoque: 0, ordem: 2, real: false });
});

afterAll(async () => { await limparEvento(eventoId); });

async function fazerSessaoPronta(): Promise<{ sid: string; token: string }> {
  const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_dados');
  const token = await sessaoJwt(sid, eventoId, 'roleta');
  return { sid, token };
}

const dadosValidos = (telefone: string) => ({
  nome: 'Maria Teste',
  telefone,
  email: 'maria@test.local',
  loja_id: null,
});

describe('submeter-dados', () => {
  it('payload válido -> sorteia, baixa estoque, status=pronta_para_girar', async () => {
    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn<any>('submeter-dados', {
      s: sid, t: token,
      dados: dadosValidos('54988887701'),
      fingerprint: 'ab'.repeat(16),
    });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);

    const { data } = await sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id, jogador_nome')
      .eq('id', sid).single();
    expect(data?.status).toBe('pronta_para_girar');
    expect(data?.premio_sorteado_id).toBeTruthy();
    expect(data?.jogador_nome).toBe('Maria Teste');
  });

  it('telefone com DDD inválido -> 400', async () => {
    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn('submeter-dados', {
      s: sid, t: token,
      dados: dadosValidos('00988887702'),
      fingerprint: 'cd'.repeat(16),
    });
    expect(r.status).toBe(400);
  });

  it('telefone duplicado mesmo evento+jogo -> 409', async () => {
    const fp = 'ef'.repeat(16);
    // 1ª jogada
    const a = await fazerSessaoPronta();
    const ra = await callFn('submeter-dados', {
      s: a.sid, t: a.token,
      dados: dadosValidos('54988887703'),
      fingerprint: fp,
    });
    expect(ra.status).toBe(200);

    // 2ª com mesmo telefone
    const b = await fazerSessaoPronta();
    const rb = await callFn('submeter-dados', {
      s: b.sid, t: b.token,
      dados: dadosValidos('54988887703'),
      fingerprint: '12'.repeat(16),
    });
    expect(rb.status).toBe(409);
  });

  it('fingerprint na blacklist -> 403', async () => {
    const fp = 'bb'.repeat(16);
    await sb.from('fingerprints_bloqueados')
      .insert({ fingerprint: fp, motivo: 'teste', bloqueado_por: operadorId });

    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn('submeter-dados', {
      s: sid, t: token,
      dados: dadosValidos('54988887704'),
      fingerprint: fp,
    });
    expect(r.status).toBe(403);

    await sb.from('fingerprints_bloqueados').delete().eq('fingerprint', fp);
  });

  it('email malformado -> 400', async () => {
    const { sid, token } = await fazerSessaoPronta();
    const r = await callFn('submeter-dados', {
      s: sid, t: token,
      dados: { ...dadosValidos('54988887705'), email: 'naoehemail' },
      fingerprint: 'aa'.repeat(16),
    });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 12.2: RED**

```bash
npm run test:functions -- submeter-dados
```
Expected: 5 failing.

- [ ] **Step 12.3: Implementar**

`supabase/functions/submeter-dados/index.ts`:

```typescript
import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errConflict, errForbidden } from '../_shared/errors.ts';
import { parseBody, uuidSchema, dadosJogadorSchema, fingerprintSchema } from '../_shared/validators.ts';
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

    // Blacklist.
    const { data: bloqueado } = await sb
      .from('fingerprints_bloqueados')
      .select('fingerprint').eq('fingerprint', fingerprint).maybeSingle();
    if (bloqueado) throw errForbidden('Dispositivo bloqueado');

    // Update jogador na sessão (e validar status).
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
      // 23505 = unique_violation (telefone duplicado)
      if ((uErr as { code?: string }).code === '23505') {
        throw errConflict(
          'Este telefone já jogou nesta Roleta. Cada celular pode jogar uma vez por evento por jogo.'
        );
      }
      throw new Error(`update sessao: ${uErr.message}`);
    }
    if (!sessao) throw errConflict('Sessão não está em aguardando_dados');

    // Sortear (atômico).
    const { error: rpcErr } = await sb.rpc('sortear_e_baixar_estoque', { p_sessao_id: s });
    if (rpcErr) {
      // Reverter os dados gravados se sortear falhou
      await sb.from('sessoes_jogo').update({
        jogador_nome: null, jogador_telefone: null, jogador_email: null,
        jogador_loja_id: null, jogador_fingerprint: null,
      }).eq('id', s);
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
```

- [ ] **Step 12.4: GREEN**

```bash
npm run test:functions -- submeter-dados
```
Expected: 5 passing.

- [ ] **Step 12.5: Commit**

```bash
git add supabase/functions/submeter-dados/ tests/edge-functions/submeter-dados.test.ts
git commit -m "feat(fn): add submeter-dados (validates, persists, calls sortear, audit)"
```

---

## Task 13 — Edge Function: `iniciar-animacao` (TDD)

**Files:**
- Create: `tests/edge-functions/iniciar-animacao.test.ts`
- Create: `supabase/functions/iniciar-animacao/index.ts`

Recebe `{ sessao_id }`. Auth: JWT-Operador (totem está logado). Transita `pronta_para_girar -> girando`. Idempotente (chamar 2x não erra).

- [ ] **Step 13.1: Escrever o teste**

`tests/edge-functions/iniciar-animacao.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, criarPremioTest, criarSessaoTest, limparEvento } from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string, opJwt: string;
let premioId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  premioId = await criarPremioTest(eventoId, { nome: 'X', peso: 1, ordem: 1 });
  opJwt = await operadorJwt(operadorId);
});

afterAll(async () => { await limparEvento(eventoId); });

async function sessaoPronta(): Promise<string> {
  const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_dados');
  await sb.from('sessoes_jogo').update({
    jogador_nome: 'X', jogador_telefone: '54988880099', jogador_email: 'x@x',
    premio_sorteado_id: premioId, status: 'pronta_para_girar',
  }).eq('id', sid);
  return sid;
}

describe('iniciar-animacao', () => {
  it('pronta_para_girar -> girando', async () => {
    const sid = await sessaoPronta();
    const r = await callFn('iniciar-animacao',
      { sessao_id: sid },
      { Authorization: `Bearer ${opJwt}` });
    expect(r.status).toBe(200);
    const { data } = await sb.from('sessoes_jogo').select('status').eq('id', sid).single();
    expect(data?.status).toBe('girando');
  });

  it('idempotente: chamar 2x quando já girando -> 200', async () => {
    const sid = await sessaoPronta();
    await callFn('iniciar-animacao', { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    const r2 = await callFn('iniciar-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r2.status).toBe(200);
  });

  it('status errado -> 409', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const r = await callFn('iniciar-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r.status).toBe(409);
  });

  it('sem JWT -> 401', async () => {
    const r = await callFn('iniciar-animacao', { sessao_id: 'x' });
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 13.2: RED**

```bash
npm run test:functions -- iniciar-animacao
```
Expected: 4 failing.

- [ ] **Step 13.3: Implementar**

`supabase/functions/iniciar-animacao/index.ts`:

```typescript
import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errUnauthorized, errConflict } from '../_shared/errors.ts';
import { parseBody, uuidSchema } from '../_shared/validators.ts';
import { getOperadorIdFromHeader } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const bodySchema = z.object({ sessao_id: uuidSchema });

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const operadorId = await getOperadorIdFromHeader(req);
    if (!operadorId) throw errUnauthorized('JWT-Operador ausente ou inválido');

    const { sessao_id } = parseBody(bodySchema, await req.json());
    const sb = getServiceClient();

    const { data: atual } = await sb
      .from('sessoes_jogo').select('status').eq('id', sessao_id).single();
    if (!atual) throw errConflict('Sessão não encontrada');
    if (atual.status === 'girando') {
      return jsonOk({ ok: true, status: 'girando' });   // idempotente
    }
    if (atual.status !== 'pronta_para_girar') {
      throw errConflict(`Status inválido: ${atual.status}`);
    }

    const { error } = await sb
      .from('sessoes_jogo')
      .update({ status: 'girando' })
      .eq('id', sessao_id)
      .eq('status', 'pronta_para_girar');
    if (error) throw new Error(`update girando: ${error.message}`);

    return jsonOk({ ok: true, status: 'girando' });
  } catch (err) {
    return jsonErr(err);
  }
});
```

- [ ] **Step 13.4: GREEN**

```bash
npm run test:functions -- iniciar-animacao
```
Expected: 4 passing.

- [ ] **Step 13.5: Commit**

```bash
git add supabase/functions/iniciar-animacao/ tests/edge-functions/iniciar-animacao.test.ts
git commit -m "feat(fn): add iniciar-animacao (pronta_para_girar -> girando, idempotente)"
```

---

## Task 14 — Edge Function: `concluir-animacao` (TDD)

**Files:**
- Create: `tests/edge-functions/concluir-animacao.test.ts`
- Create: `supabase/functions/concluir-animacao/index.ts`

Recebe `{ sessao_id }`. Auth: JWT-Operador. Transita `girando -> finalizada`. Define `finalizada_em`. Idempotente.

- [ ] **Step 14.1: Escrever o teste**

`tests/edge-functions/concluir-animacao.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, criarPremioTest, criarSessaoTest, limparEvento } from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string, opJwt: string;
let premioId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  premioId = await criarPremioTest(eventoId, { nome: 'X', peso: 1, ordem: 1 });
  opJwt = await operadorJwt(operadorId);
});

afterAll(async () => { await limparEvento(eventoId); });

async function sessaoGirando(): Promise<string> {
  const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_dados');
  await sb.from('sessoes_jogo').update({
    jogador_nome: 'X', jogador_telefone: '54988880088', jogador_email: 'x@x',
    premio_sorteado_id: premioId, status: 'girando',
  }).eq('id', sid);
  return sid;
}

describe('concluir-animacao', () => {
  it('girando -> finalizada + finalizada_em preenchido', async () => {
    const sid = await sessaoGirando();
    const r = await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r.status).toBe(200);
    const { data } = await sb.from('sessoes_jogo')
      .select('status, finalizada_em').eq('id', sid).single();
    expect(data?.status).toBe('finalizada');
    expect(data?.finalizada_em).toBeTruthy();
  });

  it('idempotente: já finalizada -> 200', async () => {
    const sid = await sessaoGirando();
    await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    const r2 = await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r2.status).toBe(200);
  });

  it('status errado -> 409', async () => {
    const sid = await criarSessaoTest(eventoId, operadorId, 'aguardando_celular');
    const r = await callFn('concluir-animacao',
      { sessao_id: sid }, { Authorization: `Bearer ${opJwt}` });
    expect(r.status).toBe(409);
  });
});
```

- [ ] **Step 14.2: RED**

```bash
npm run test:functions -- concluir-animacao
```
Expected: 3 failing.

- [ ] **Step 14.3: Implementar**

`supabase/functions/concluir-animacao/index.ts`:

```typescript
import { z } from '../_shared/deps.ts';
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errUnauthorized, errConflict } from '../_shared/errors.ts';
import { parseBody, uuidSchema } from '../_shared/validators.ts';
import { getOperadorIdFromHeader } from '../_shared/jwt.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const bodySchema = z.object({ sessao_id: uuidSchema });

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    const operadorId = await getOperadorIdFromHeader(req);
    if (!operadorId) throw errUnauthorized('JWT-Operador ausente ou inválido');

    const { sessao_id } = parseBody(bodySchema, await req.json());
    const sb = getServiceClient();

    const { data: atual } = await sb
      .from('sessoes_jogo').select('status').eq('id', sessao_id).single();
    if (!atual) throw errConflict('Sessão não encontrada');
    if (atual.status === 'finalizada') {
      return jsonOk({ ok: true, status: 'finalizada' });
    }
    if (atual.status !== 'girando') {
      throw errConflict(`Status inválido: ${atual.status}`);
    }

    const { error } = await sb
      .from('sessoes_jogo')
      .update({ status: 'finalizada', finalizada_em: new Date().toISOString() })
      .eq('id', sessao_id)
      .eq('status', 'girando');
    if (error) throw new Error(`update finalizada: ${error.message}`);

    return jsonOk({ ok: true, status: 'finalizada' });
  } catch (err) {
    return jsonErr(err);
  }
});
```

- [ ] **Step 14.4: GREEN**

```bash
npm run test:functions -- concluir-animacao
```
Expected: 3 passing.

- [ ] **Step 14.5: Commit**

```bash
git add supabase/functions/concluir-animacao/ tests/edge-functions/concluir-animacao.test.ts
git commit -m "feat(fn): add concluir-animacao (girando -> finalizada, idempotente)"
```

---

## Task 15 — Edge Function: `processar-imagem` (TDD)

**Files:**
- Create: `tests/edge-functions/processar-imagem.test.ts`
- Create: `supabase/functions/processar-imagem/index.ts`

Recebe FormData com arquivo de imagem. Auth: JWT-Admin (modo elevado obrigatório — só admin manipula prêmios). Valida tamanho ≤5MB. Faz upload pro bucket `fotos_premios` em `<premio_id>/<uuid>.webp`. Retorna `{ foto_path }`. **No MVP, não fazemos redimensionamento Sharp** — o frontend manda já comprimido. Aceita PNG, JPEG, WEBP.

- [ ] **Step 15.1: Escrever o teste**

`tests/edge-functions/processar-imagem.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { adminJwt, operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';
import { criarEventoTest, criarPremioTest, limparEvento } from './helpers/fixtures';

const sb = service();
let eventoId: string, operadorId: string, adminTok: string, opTok: string;
let premioId: string;

beforeAll(async () => {
  const r = await criarEventoTest();
  eventoId = r.eventoId; operadorId = r.operadorId;
  premioId = await criarPremioTest(eventoId, { nome: 'X', peso: 1, ordem: 1 });
  adminTok = await adminJwt(operadorId);
  opTok = await operadorJwt(operadorId);
});

afterAll(async () => { await limparEvento(eventoId); });

function pngBytes(): Buffer {
  // PNG minimo 1x1 transparente (67 bytes)
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d49444154789c63000100000005000100' +
    '0d0a2db4000000004945eb0000000049454e44ae426082', 'hex'
  );
}

async function postMultipart(url: string, file: Buffer, headers: Record<string, string>) {
  const fd = new FormData();
  fd.append('premio_id', premioId);
  fd.append('arquivo', new Blob([file], { type: 'image/png' }), 'foto.png');
  const res = await fetch(url, { method: 'POST', headers, body: fd });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const URL = `${process.env.FUNCTIONS_URL}/processar-imagem`;

describe('processar-imagem', () => {
  it('admin envia PNG válido -> retorna foto_path e arquivo no Storage', async () => {
    const r = await postMultipart(URL, pngBytes(), { Authorization: `Bearer ${adminTok}` });
    expect(r.status).toBe(200);
    expect(r.body.foto_path).toMatch(new RegExp(`^${premioId}/`));

    const { data } = await sb.storage.from('fotos_premios').download(r.body.foto_path);
    expect(data).toBeTruthy();
  });

  it('operador sem admin -> 403', async () => {
    const r = await postMultipart(URL, pngBytes(), { Authorization: `Bearer ${opTok}` });
    expect(r.status).toBe(403);
  });

  it('sem auth -> 401', async () => {
    const r = await postMultipart(URL, pngBytes(), {});
    expect(r.status).toBe(401);
  });

  it('arquivo >5MB -> 400', async () => {
    const big = Buffer.alloc(5_500_000, 0x80); // 5.5MB
    const r = await postMultipart(URL, big, { Authorization: `Bearer ${adminTok}` });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 15.2: RED**

```bash
npm run test:functions -- processar-imagem
```
Expected: 4 failing.

- [ ] **Step 15.3: Implementar**

`supabase/functions/processar-imagem/index.ts`:

```typescript
import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errForbidden, errUnauthorized } from '../_shared/errors.ts';
import { uuidSchema } from '../_shared/validators.ts';
import { jwtVerify } from '../_shared/deps.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_MIME = ['image/png', 'image/jpeg', 'image/webp'];

function getSupabaseJwtSecret(): Uint8Array {
  const s = Deno.env.get('SUPABASE_JWT_SECRET');
  if (!s) throw new Error('SUPABASE_JWT_SECRET ausente');
  return new TextEncoder().encode(s);
}

/** Valida JWT-Admin (modo elevado obrigatório). */
async function exigirAdmin(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw errUnauthorized('Token ausente');
  try {
    const { payload } = await jwtVerify(auth.slice(7), getSupabaseJwtSecret(), {
      algorithms: ['HS256'],
    });
    if (payload.admin_elevado !== true) throw errForbidden('Modo admin necessário');
    return payload.sub as string;
  } catch (e) {
    if ((e as { status?: number }).status) throw e;
    throw errUnauthorized('Token inválido');
  }
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    await exigirAdmin(req);

    const form = await req.formData();
    const premioId = form.get('premio_id');
    const arquivo = form.get('arquivo');

    if (typeof premioId !== 'string' || !uuidSchema.safeParse(premioId).success) {
      throw errBadRequest('premio_id inválido');
    }
    if (!(arquivo instanceof File)) {
      throw errBadRequest('arquivo ausente');
    }
    if (arquivo.size > MAX_BYTES) {
      throw errBadRequest(`Arquivo muito grande (${arquivo.size} bytes; máx ${MAX_BYTES})`);
    }
    if (!ACCEPT_MIME.includes(arquivo.type)) {
      throw errBadRequest(`Tipo não permitido: ${arquivo.type}. Use PNG, JPEG ou WEBP.`);
    }

    const sb = getServiceClient();
    const ext = arquivo.type === 'image/png' ? 'png'
              : arquivo.type === 'image/jpeg' ? 'jpg'
              : 'webp';
    const path = `${premioId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await sb.storage
      .from('fotos_premios')
      .upload(path, arquivo, { contentType: arquivo.type, upsert: false });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    return jsonOk({ foto_path: path });
  } catch (err) {
    return jsonErr(err);
  }
});
```

- [ ] **Step 15.4: GREEN**

```bash
npm run test:functions -- processar-imagem
```
Expected: 4 passing.

- [ ] **Step 15.5: Commit**

```bash
git add supabase/functions/processar-imagem/ tests/edge-functions/processar-imagem.test.ts
git commit -m "feat(fn): add processar-imagem (admin uploads to fotos_premios bucket)"
```

---

## Task 16 — Teste E2E happy-path

**Files:**
- Create: `tests/edge-functions/happy-path.test.ts`

Encadeia liberar → obter → submeter → iniciar → concluir e verifica o estado em cada passo.

- [ ] **Step 16.1: Escrever o teste**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callFn } from './helpers/functions';
import { operadorJwt } from './helpers/jwt';
import { service } from './helpers/supabase';

const sb = service();
const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_DEMO = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
let opTok: string;

beforeAll(async () => { opTok = await operadorJwt(OPERADOR_ID); });

afterAll(async () => {
  // limpar sessoes/ganhadores criados pelo teste do evento DEMO
  await sb.from('ganhadores').delete().eq('evento_id', EVENTO_DEMO)
    .like('jogador_telefone', '54988e2e%');
  await sb.from('sessoes_jogo').delete().eq('evento_id', EVENTO_DEMO)
    .like('jogador_telefone', '54988e2e%');
});

describe('happy-path E2E', () => {
  it('liberar -> obter -> submeter -> iniciar -> concluir', async () => {
    // 1. liberar
    const r1 = await callFn<any>('liberar-jogada',
      { jogo: 'roleta' }, { Authorization: `Bearer ${opTok}` });
    expect(r1.status).toBe(200);
    const { sessao_id, token } = r1.body;

    // 2. obter
    const r2 = await callFn<any>('obter-sessao', { s: sessao_id, t: token });
    expect(r2.status).toBe(200);
    expect(r2.body.premios.length).toBeGreaterThan(0);

    // 3. submeter
    const r3 = await callFn<any>('submeter-dados', {
      s: sessao_id, t: token,
      dados: {
        nome: 'E2E Tester', telefone: '54988e2e000'.slice(0, 11).replace(/[^0-9]/g, '0').padEnd(11, '9'),
        email: 'e2e@tester.local', loja_id: null,
      },
      fingerprint: '0e2e'.repeat(8),
    });
    expect(r3.status).toBe(200);

    // 4. iniciar
    const r4 = await callFn('iniciar-animacao',
      { sessao_id }, { Authorization: `Bearer ${opTok}` });
    expect(r4.status).toBe(200);

    // 5. concluir
    const r5 = await callFn('concluir-animacao',
      { sessao_id }, { Authorization: `Bearer ${opTok}` });
    expect(r5.status).toBe(200);

    // Estado final
    const { data: final } = await sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id, finalizada_em')
      .eq('id', sessao_id).single();
    expect(final?.status).toBe('finalizada');
    expect(final?.premio_sorteado_id).toBeTruthy();
    expect(final?.finalizada_em).toBeTruthy();

    // Ganhador registrado
    const { data: ganh } = await sb.from('ganhadores')
      .select('jogador_nome, premio_id').eq('sessao_id', sessao_id).single();
    expect(ganh?.jogador_nome).toBe('E2E Tester');
  });
});
```

- [ ] **Step 16.2: Rodar**

```bash
npm run test:functions -- happy-path
```
Expected: 1 passing.

- [ ] **Step 16.3: Commit**

```bash
git add tests/edge-functions/happy-path.test.ts
git commit -m "test(fn): add happy-path E2E chaining all 5 game-state edge functions"
```

---

## Task 17 — Atualizar README + CI

**Files:**
- Modify: `README.md`
- Create: `.github/workflows/ci-functions.yml`

- [ ] **Step 17.1: Modificar `README.md` — adicionar seção sobre functions**

Localizar a seção `## Comandos úteis` e substituir por:

```markdown
## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run db:start` | Sobe stack Supabase local |
| `npm run db:stop` | Derruba stack |
| `npm run db:reset` | Reset + migrations + seed |
| `npm run db:status` | Mostra URLs e chaves do stack |
| `npm run test:db` | Roda pgTAP tests (Plano 1) |
| `npm run functions:serve` | Hot-reload das Edge Functions em :54321 |
| `npm run test:functions` | Roda Vitest contra as Edge Functions (requer `functions:serve` rodando) |
| `npm run test` | db tests + function tests sequencial |
| `npm run typecheck` | TypeScript check |
```

Logo abaixo, antes de `## Estrutura`, adicionar:

```markdown
## Rodando os testes de Edge Functions

Em **dois terminais separados**:

```bash
# Terminal 1 — sobe as functions (hot reload)
npm run functions:serve

# Terminal 2 — roda os testes
npm run test:functions
```

Se o terminal 1 não estiver rodando, os testes falham com `connect ECONNREFUSED`.

Em CI a orquestração é automática via GitHub Actions.
```

- [ ] **Step 17.2: Criar `.github/workflows/ci-functions.yml`**

```yaml
name: CI — Edge Functions

on:
  push:
    branches: [main, develop]
    paths:
      - 'supabase/functions/**'
      - 'tests/edge-functions/**'
      - 'package.json'
      - '.github/workflows/ci-functions.yml'
  pull_request:
    paths:
      - 'supabase/functions/**'
      - 'tests/edge-functions/**'

jobs:
  vitest:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - uses: supabase/setup-cli@v1
        with: { version: latest }

      - name: Start Supabase
        run: supabase start

      - name: Apply schema + seed
        run: supabase db reset --no-seed=false

      - name: Start functions (background)
        run: |
          supabase functions serve --no-verify-jwt > /tmp/functions.log 2>&1 &
          for i in {1..30}; do
            if curl -sf http://127.0.0.1:54321/functions/v1/_health 2>/dev/null; then break; fi
            sleep 1
          done

      - name: Generate .env.test from supabase status
        run: |
          supabase status -o env > .env.test
          echo "SESSAO_JWT_SECRET=test-sessao-secret-with-at-least-32-characters-aaa" >> .env.test
          echo "FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1" >> .env.test

      - name: Run Vitest
        run: npm run test:functions

      - name: Dump functions log on failure
        if: failure()
        run: cat /tmp/functions.log

      - name: Cleanup
        if: always()
        run: supabase stop --no-backup
```

- [ ] **Step 17.3: Commit**

```bash
git add README.md .github/workflows/ci-functions.yml
git commit -m "docs(fn): document functions:serve flow; ci: add edge functions workflow"
```

---

## Task 18 — Tag final do Plano 2

- [ ] **Step 18.1: Verificar tudo verde localmente**

Em 2 terminais:
```bash
# T1
npm run functions:serve

# T2
npm run db:reset
npm run test:db          # 83 pgTAP
npm run test:functions   # ~25+ vitest
```

Expected: ambos PASS.

- [ ] **Step 18.2: Criar tag `plano-2-completo`**

```bash
git tag -a "plano-2-completo" -m "Plano 2: 7 Edge Functions + shared utils + Vitest E2E + CI"
git log --oneline | head -25
```

---

## Resumo pós-Plano 2

✅ `supabase/functions/_shared/` com 8 módulos (deps, types, errors, response, jwt, validators, supabase-client, audit)
✅ 7 Edge Functions implementadas com handlers <100 linhas cada
✅ Migration helper `private.definir_senha_admin` + `private.verificar_senha_admin` (bcrypt server-side)
✅ ~25 testes Vitest cobrindo: tokens válidos/expirados/forjados, payload malformado, status errado, idempotência, blacklist, telefone duplicado, rate limit admin, upload de imagem
✅ Teste E2E happy-path cobrindo o fluxo completo de uma jogada
✅ GH Actions `ci-functions.yml` rodando Supabase + functions serve + vitest

**Validação final manual:**
- `npm run db:reset` + `npm run test:db` → 83/83 ✅
- `npm run functions:serve` em outra janela + `npm run test:functions` → ~25/25 ✅

---

## Self-Review

**1. Spec coverage (Seção 4 + 5 do spec):**
- Sequência completa de 16 passos do happy path → coberta pelas 5 funções de estado (Tasks 10-14) + E2E (Task 16) ✅
- JWT-Sessão (capability token) com `nonce`/`exp`/`s` → Task 5 (jwt.ts) ✅
- JWT-Admin com `admin_elevado=true` assinado com SUPABASE_JWT_SECRET → Task 5 + Task 9 ✅
- Validações server-side (telefone DDD, fingerprint, blacklist) → Task 6 (validators) + Task 12 (submeter) ✅
- Sleep aleatório anti-timing no admin login → Task 9 ✅
- Rate limit 5/IP/10min no admin login → Task 9 ✅
- Auditoria em toda ação sensível → Task 7 (audit.ts) usada em Tasks 9-12 ✅
- Reverter dados se sortear falha → Task 12 ✅
- Idempotência em iniciar/concluir-animacao → Tasks 13-14 ✅
- Upload imagem com check de tamanho e MIME → Task 15 ✅
- bcrypt server-side via pgcrypto (CLI Plano 3 vai consumir) → Task 2 ✅

**2. Placeholder scan:** zero TBD/TODO/FIXME. Todo código está completo com imports, types e error handling. ✅

**3. Type consistency:**
- `JwtSessaoPayload { s, e, g, iat, exp, nonce }` definido em `types.ts` (Task 3) e usado/assinado consistente em `jwt.ts` (Task 5) e teste helpers (Task 8). ✅
- `DadosJogador { nome, telefone, email, loja_id? }` definido em `types.ts` e validado por `dadosJogadorSchema` em `validators.ts` (Task 6) e usado em `submeter-dados` (Task 12). ✅
- Funções helper `getOperadorIdFromHeader`, `signSessaoToken`, `verifySessaoToken`, `signAdminToken` definidas em Task 5 e referenciadas com mesmas assinaturas em Tasks 9-14. ✅
- `getServiceClient()` (Task 7) consumida sempre por `supabase-client.ts` import — consistente. ✅
- `audit()` signature `(client, entry)` consistente. ✅
- `parseBody(schema, body)` em Task 6, mesmo nome usado em Tasks 9-15. ✅

Plano completo, autocontido, executável task-por-task.
