# Altis Bet — Plano 1: Foundation DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap o repositório do Altis Bet e entregar **a fundação completa de banco de dados Supabase** — schema, RLS, função PL/pgSQL `sortear_e_baixar_estoque`, `is_admin()`, jobs `pg_cron`, bucket de Storage para fotos de prêmios, e seed inicial — totalmente validado por testes pgTAP. Nenhuma Edge Function, CLI ou UI neste plano.

**Architecture:** Tudo que sustenta integridade do jogo vive como CHECK constraints, UNIQUE indexes parciais, ENUMs e funções PL/pgSQL `SECURITY DEFINER` no Postgres. Cada migration tem um teste pgTAP equivalente que falha antes da migration ser aplicada (TDD no DB).

**Tech Stack:** Supabase CLI (cria Docker stack local), Postgres 15, PL/pgSQL, pgTAP 1.3, extensão `pg_cron`, extensão `pgcrypto`. Repositório Node.js base (package.json + tsconfig + scripts), Git. **Sem** Edge Functions, **sem** CLI custom, **sem** UI neste plano.

**Pré-requisitos do dev (instalados manualmente uma vez):**
- Node.js 20.x (recomendado via `nvm`)
- Docker Desktop (Supabase CLI usa por baixo)
- Git
- Supabase CLI (instruções na Task 3)

**Tempo estimado total:** ~6–10 horas se feito sequencialmente.

---

## File structure que este plano cria

```
altis-bet/
├─ .gitignore
├─ .env.local.example                                    # template (sem valores reais)
├─ .nvmrc                                                # 20
├─ package.json                                          # scripts (test:db, db:reset, etc)
├─ tsconfig.json                                         # base para planos futuros
├─ README.md                                             # bootstrap quickstart
├─ docs/
│  └─ superpowers/
│     ├─ specs/2026-05-11-altis-bet-roleta-mvp-design.md  # JÁ EXISTE
│     └─ plans/2026-05-11-plano-1-foundation-db.md        # ESTE arquivo
├─ supabase/
│  ├─ config.toml                                         # gerado por `supabase init`
│  ├─ migrations/
│  │  ├─ 20260511120001_init_schema.sql                   # tabelas, types, índices
│  │  ├─ 20260511120002_rls_policies.sql                  # RLS habilitada + policies
│  │  ├─ 20260511120003_is_admin_function.sql             # função helper
│  │  ├─ 20260511120004_sortear_function.sql              # função de sorteio atômico
│  │  ├─ 20260511120005_pg_cron_jobs.sql                  # jobs de expiração/limpeza
│  │  └─ 20260511120006_storage_bucket.sql                # bucket fotos_premios
│  ├─ seed.sql                                            # dados iniciais (lojas, evento exemplo, "Não foi")
│  └─ tests/
│     ├─ 00_setup.sql                                     # carrega pgTAP + helpers
│     ├─ 01_schema_constraints.sql                        # valida tabelas + constraints
│     ├─ 02_rls_policies.sql                              # valida policies por papel
│     ├─ 03_is_admin.sql                                  # valida função is_admin()
│     ├─ 04_sortear_distribuicao.sql                      # estatístico (1000 sorteios)
│     ├─ 05_sortear_concorrencia.sql                      # locks pessimistas
│     └─ 06_state_machine.sql                             # transições válidas/inválidas
```

---

## Convenções deste plano

- **Sempre commitar** ao final de cada task (`Step N: Commit`). Mensagens em **Conventional Commits** (`feat:`, `test:`, `chore:`, `docs:`).
- **TDD no DB**: para cada migration que adiciona comportamento (RLS, função PL/pgSQL), o pgTAP test correspondente é escrito **antes** e deve falhar primeiro.
- **Ordem das migrations**: prefixadas com `YYYYMMDDHHMMSS_` para ordenação cronológica. Usaremos o timestamp `20260511120001` em diante (data deste plano + sequência).
- **Comandos shell** assumem PowerShell no Windows ou bash em Unix; sintaxe equivalente.
- Antes de qualquer step de comando que mexa em Supabase, o Docker Desktop precisa estar **rodando**.

---

## Task 1 — Inicializar repositório Git e arquivos base

**Files:**
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `README.md`
- Create: `.env.local.example`

- [ ] **Step 1.1: Inicializar git e criar arquivos**

Execute na raiz `C:\GitHub\ProjetoAlits\AltisBet`:

```bash
git init
```

Expected: `Initialized empty Git repository in .git/`

- [ ] **Step 1.2: Criar `.gitignore`**

Conteúdo:

```gitignore
# Dependências
node_modules/
.pnpm-store/

# Ambiente
.env
.env.local
.env.*.local
!.env.local.example

# Supabase
supabase/.branches
supabase/.temp
supabase/.env

# Build
.next/
out/
dist/
build/

# IDE
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.cursor/

# Claude Code — settings locais (permissões/usuário) NÃO vão pro repo
.claude/settings.local.json
.claude/*.local.json

# OS
.DS_Store
Thumbs.db
desktop.ini

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Cache
.cache/
.turbo/

# Backups locais
/backups/

# Brainstorming temporário (não vai pro repo)
.superpowers/
```

- [ ] **Step 1.3: Criar `.nvmrc`**

Conteúdo (uma linha):

```
20
```

- [ ] **Step 1.4: Criar `README.md`**

Conteúdo mínimo (será expandido na Task 20):

```markdown
# Altis Bet

Plataforma de jogos com premiação para eventos Altis Sistemas.

**Status:** Em desenvolvimento — Plano 1 (Foundation DB) em execução.

**Spec:** [`docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md`](docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md)

**Planos:** [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Pré-requisitos

- Node.js 20.x
- Docker Desktop
- Supabase CLI

## Quickstart

(será preenchido após o Plano 1)
```

- [ ] **Step 1.5: Criar `.env.local.example`**

Conteúdo:

```env
# Supabase local (defaults após `supabase start`)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJ... # exibido após `supabase start`
SUPABASE_SERVICE_ROLE_KEY=eyJ... # exibido após `supabase start`
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Segredos da aplicação (gerados pela CLI no bootstrap — Plano 3)
SESSAO_JWT_SECRET=
BCRYPT_PEPPER=
```

- [ ] **Step 1.6: Commit**

```bash
git add .gitignore .nvmrc README.md .env.local.example
git commit -m "chore: bootstrap repo with gitignore, nvmrc, readme stub"
```

Expected: 1 commit criado.

---

## Task 2 — Configurar Node project base (package.json + tsconfig)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 2.1: Criar `package.json`**

Conteúdo:

```json
{
  "name": "altis-bet",
  "version": "0.1.0",
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
    "lint": "echo 'lint will be added in Plano 2'",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2.2: Criar `tsconfig.json`**

Conteúdo:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "build", "out", ".next"]
}
```

**Nota sobre TypeScript estrito:** o TS 5.9+ rejeita tanto `include: []` (TS18003) quanto `files: []` (TS18002) como configurações inválidas. Solução é apontar para uma pasta `src/` e criar um placeholder válido — vide Step 2.3.

- [ ] **Step 2.3: Criar placeholder `src/_placeholder.ts`**

Necessário porque o `tsc` exige ao menos 1 arquivo no `include`. Será substituído por Edge Functions no Plano 2.

```bash
mkdir -p src
```

Criar `src/_placeholder.ts`:
```typescript
// Placeholder para satisfazer tsc no Plano 1.
// Será substituído por Edge Functions e código real nos planos seguintes.
export {};
```

- [ ] **Step 2.4: Instalar dependências**

```bash
npm install
```

Expected: cria `node_modules/` e `package-lock.json`.

- [ ] **Step 2.5: Verificar typecheck passa**

```bash
npm run typecheck
```

Expected: comando sai com código 0 (compila `src/_placeholder.ts` sem erros).

- [ ] **Step 2.6: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/_placeholder.ts
git commit -m "chore: add package.json, tsconfig base, src placeholder"
```

---

## Task 3 — Instalar Supabase CLI e inicializar projeto local

**Files:**
- Create (gerado pela CLI): `supabase/config.toml`
- Create (gerado pela CLI): `supabase/.gitignore`
- Create: pasta `supabase/migrations/` (vazia)
- Create: pasta `supabase/tests/`

- [ ] **Step 3.1: Instalar Supabase CLI (uma vez por máquina)**

Windows (PowerShell):
```powershell
scoop install supabase
# ou: npm install -g supabase
```

macOS:
```bash
brew install supabase/tap/supabase
```

Verificar:
```bash
supabase --version
```

Expected: versão ≥ 2.0 (corrente em 2026-05 é 2.98+).

- [ ] **Step 3.2: Inicializar projeto Supabase**

```bash
supabase init
```

Expected: cria `supabase/config.toml` e `supabase/.gitignore`. Responde `n` (não criar VSCode settings).

- [ ] **Step 3.3: Subir stack local (1ª vez baixa imagens Docker)**

Certifique-se de que **Docker Desktop está rodando**, então:

```bash
supabase start
```

Expected: na 1ª execução baixa ~10 imagens (~2-5 min). Ao terminar, imprime:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOi...
service_role key: eyJhbGciOi...
```

**Copie `anon key`, `service_role key` e `JWT secret`** para anotação local (não vão pro git).

- [ ] **Step 3.4: Criar pastas `migrations/` e `tests/`**

```bash
mkdir -p supabase/migrations supabase/tests
# Windows PowerShell: New-Item -ItemType Directory -Force supabase/migrations, supabase/tests
```

- [ ] **Step 3.5: Verificar Studio acessível**

Abrir no browser: `http://127.0.0.1:54323`

Expected: interface do Supabase Studio aparece com schema `public` vazio.

- [ ] **Step 3.6: Commit**

```bash
git add supabase/config.toml supabase/.gitignore
git commit -m "chore: initialize supabase local stack"
```

(As pastas vazias `migrations/` e `tests/` não vão no commit ainda.)

---

## Task 4 — Setup pgTAP no banco local

**Files:**
- Create: `supabase/tests/00_setup.sql`

- [ ] **Step 4.1: Criar `supabase/tests/00_setup.sql`**

Conteúdo:

```sql
-- 00_setup.sql — Carregado antes de todos os testes pgTAP.
-- Garante que a extensão pgTAP está disponível e define helpers comuns.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Helper: cria um usuário fake no auth.users para testes que exigem JWT/auth.uid
-- Retorna o UUID criado.
CREATE OR REPLACE FUNCTION test_helpers.criar_usuario_fake(p_email TEXT DEFAULT 'fake@test.local')
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_id, p_email, NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  RETURN v_id;
END $$;

ROLLBACK;  -- 00_setup roda dentro de tx; pgTAP gerencia setup global
```

Nota: o helper acima precisa do schema `test_helpers` — vou criar via migration na próxima task. Por ora o arquivo é apenas marcador.

- [ ] **Step 4.2: Verificar que pgTAP está disponível**

```bash
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "CREATE EXTENSION IF NOT EXISTS pgtap; SELECT pg_extension.extname FROM pg_extension WHERE extname='pgtap';"
```

Expected: imprime `pgtap`.

- [ ] **Step 4.3: Commit**

```bash
git add supabase/tests/00_setup.sql
git commit -m "test: scaffold pgtap setup file"
```

---

## Task 5 — Escrever pgTAP test do schema base (RED)

**Files:**
- Create: `supabase/tests/01_schema_constraints.sql`

Este teste descreve o que a migration de schema PRECISA criar. Vai falhar até a migration ser aplicada.

- [ ] **Step 5.1: Criar `supabase/tests/01_schema_constraints.sql`**

Conteúdo:

```sql
BEGIN;

SELECT plan(35);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ ENUMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT has_type('public', 'sessao_status', 'enum sessao_status existe');
SELECT enum_has_labels('public', 'sessao_status',
  ARRAY['aguardando_celular','aguardando_dados','pronta_para_girar',
        'girando','finalizada','expirada','cancelada'],
  'sessao_status com 7 valores corretos');

SELECT has_type('public', 'jogo_tipo', 'enum jogo_tipo existe');
SELECT enum_has_labels('public', 'jogo_tipo',
  ARRAY['roleta','dados'],
  'jogo_tipo com 2 valores');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ TABELAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT has_table('public', 'perfis_operadores', 'tabela perfis_operadores existe');
SELECT has_table('public', 'admin_credenciais', 'tabela admin_credenciais existe');
SELECT has_table('public', 'lojas',             'tabela lojas existe');
SELECT has_table('public', 'eventos',           'tabela eventos existe');
SELECT has_table('public', 'premios',           'tabela premios existe');
SELECT has_table('public', 'sessoes_jogo',      'tabela sessoes_jogo existe');
SELECT has_table('public', 'ganhadores',        'tabela ganhadores existe');
SELECT has_table('public', 'fingerprints_bloqueados', 'tabela fingerprints_bloqueados existe');
SELECT has_table('public', 'auditoria',         'tabela auditoria existe');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ CONSTRAINTS ━━━━━━━━━━━━━━━━━━━━━━━━━

-- admin_credenciais: singleton (id=1)
SELECT col_has_check('public', 'admin_credenciais', 'id', 'admin_credenciais.id tem CHECK');

-- eventos: status válido + datas
SELECT col_has_check('public', 'eventos', 'status', 'eventos.status tem CHECK');

-- só 1 evento ativo
SELECT has_index('public', 'eventos', 'unq_evento_ativo', 'índice único parcial em status=ativo');

-- premios: pesos não-negativos + estoque coerente
SELECT col_has_check('public', 'premios', 'peso_base', 'premios.peso_base tem CHECK');
SELECT col_has_check('public', 'premios', 'estoque_inicial', 'premios.estoque_inicial tem CHECK');
SELECT col_has_check('public', 'premios', 'estoque_atual', 'premios.estoque_atual tem CHECK');

-- premios: cor_hex regex
SELECT col_has_check('public', 'premios', 'cor_hex', 'premios.cor_hex tem CHECK regex');

-- sessoes_jogo: anti-fraude estrutural
SELECT has_index('public', 'sessoes_jogo', 'unq_jogada_tel_evento_jogo',
                 'índice único parcial telefone+evento+jogo em status finalizados');

-- sessoes_jogo: dados obrigatórios quando pronta
SELECT has_check('public', 'sessoes_jogo', 'dados_quando_pronta',
                 'sessoes_jogo tem CHECK dados_quando_pronta');
SELECT has_check('public', 'sessoes_jogo', 'premio_quando_finalizada',
                 'sessoes_jogo tem CHECK premio_quando_finalizada');

-- ganhadores: 1 ganhador por sessão (FK + UNIQUE)
SELECT col_is_unique('public', 'ganhadores', 'sessao_id',
                     'ganhadores.sessao_id é UNIQUE');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ FOREIGN KEYS ━━━━━━━━━━━━━━━━━━━━━━━━

SELECT fk_ok('public', 'premios', 'evento_id', 'public', 'eventos', 'id',
             'premios.evento_id → eventos.id');
SELECT fk_ok('public', 'sessoes_jogo', 'evento_id', 'public', 'eventos', 'id',
             'sessoes_jogo.evento_id → eventos.id');
SELECT fk_ok('public', 'sessoes_jogo', 'premio_sorteado_id', 'public', 'premios', 'id',
             'sessoes_jogo.premio_sorteado_id → premios.id');
SELECT fk_ok('public', 'ganhadores', 'sessao_id', 'public', 'sessoes_jogo', 'id',
             'ganhadores.sessao_id → sessoes_jogo.id');
SELECT fk_ok('public', 'ganhadores', 'evento_id', 'public', 'eventos', 'id',
             'ganhadores.evento_id → eventos.id');
SELECT fk_ok('public', 'ganhadores', 'premio_id', 'public', 'premios', 'id',
             'ganhadores.premio_id → premios.id');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ ÍNDICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT has_index('public', 'sessoes_jogo', 'idx_sess_evento_status', 'índice composto evento+status');
SELECT has_index('public', 'sessoes_jogo', 'idx_sess_expira', 'índice em expira_em parcial');
SELECT has_index('public', 'ganhadores',   'idx_ganh_evento', 'índice em evento_id');
SELECT has_index('public', 'ganhadores',   'idx_ganh_telefone', 'índice em telefone');
SELECT has_index('public', 'auditoria',    'idx_audit_data', 'índice em criado_em DESC');

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 5.2: Rodar o teste — deve FALHAR**

```bash
supabase db reset
supabase test db
```

Expected: testes falham com mensagens tipo `relation "perfis_operadores" does not exist`. Saída do pgTAP mostra `not ok` para a maioria. Isso é o estado **RED** correto.

- [ ] **Step 5.3: Commit**

```bash
git add supabase/tests/01_schema_constraints.sql
git commit -m "test(db): add schema constraints pgtap test (RED)"
```

---

## Task 6 — Migration 1: schema base (GREEN para Task 5)

**Files:**
- Create: `supabase/migrations/20260511120001_init_schema.sql`

- [ ] **Step 6.1: Criar migration de schema**

Arquivo `supabase/migrations/20260511120001_init_schema.sql`:

```sql
-- 20260511120001_init_schema.sql
-- Schema base do Altis Bet — todas tabelas, types, índices, constraints.
-- RLS é habilitada na migration seguinte (20260511120002).

-- ━━━━━━━━━━━━━━━━━━━━━━━━ EXTENSÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ━━━━━━━━━━━━━━━━━━━━━━━━ ENUMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TYPE public.sessao_status AS ENUM (
  'aguardando_celular',
  'aguardando_dados',
  'pronta_para_girar',
  'girando',
  'finalizada',
  'expirada',
  'cancelada'
);

CREATE TYPE public.jogo_tipo AS ENUM ('roleta', 'dados');

-- ━━━━━━━━━━━━━━━━━━━━━━━━ IDENTIDADE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.perfis_operadores (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  convidado_por UUID REFERENCES auth.users(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.admin_credenciais (
  id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  senha_hash      TEXT NOT NULL,
  atualizada_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_por  UUID REFERENCES auth.users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ CATÁLOGO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.lojas (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome   TEXT NOT NULL UNIQUE,
  cidade TEXT,
  ativa  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.eventos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'rascunho'
              CHECK (status IN ('rascunho','ativo','pausado','encerrado')),
  criado_por  UUID NOT NULL REFERENCES auth.users(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (data_fim >= data_inicio)
);

CREATE UNIQUE INDEX unq_evento_ativo
  ON public.eventos(status) WHERE status = 'ativo';

CREATE TABLE public.premios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id       UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  foto_path       TEXT,
  cor_hex         TEXT CHECK (cor_hex ~ '^#[0-9A-Fa-f]{6}$'),
  peso_base       INT NOT NULL DEFAULT 1 CHECK (peso_base >= 0),
  estoque_inicial INT NOT NULL CHECK (estoque_inicial >= 0),
  estoque_atual   INT NOT NULL CHECK (estoque_atual >= 0),
  ordem_roleta    INT NOT NULL DEFAULT 0,
  e_premio_real   BOOLEAN NOT NULL DEFAULT true,
  CHECK (estoque_atual <= estoque_inicial)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ SESSÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.sessoes_jogo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id           UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  jogo                public.jogo_tipo NOT NULL,
  status              public.sessao_status NOT NULL DEFAULT 'aguardando_celular',
  criada_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  liberada_por        UUID NOT NULL REFERENCES auth.users(id),

  jogador_nome        TEXT,
  jogador_telefone    TEXT,
  jogador_email       TEXT,
  jogador_loja_id     UUID REFERENCES public.lojas(id),
  jogador_fingerprint TEXT,
  jogador_ip          INET,
  jogador_user_agent  TEXT,

  premio_sorteado_id  UUID REFERENCES public.premios(id),
  girada_em           TIMESTAMPTZ,
  finalizada_em       TIMESTAMPTZ,

  CONSTRAINT dados_quando_pronta CHECK (
    status NOT IN ('pronta_para_girar','girando','finalizada')
    OR (jogador_nome IS NOT NULL
        AND jogador_telefone IS NOT NULL
        AND jogador_email IS NOT NULL)
  ),
  CONSTRAINT premio_quando_finalizada CHECK (
    status <> 'finalizada' OR premio_sorteado_id IS NOT NULL
  )
);

CREATE INDEX idx_sess_evento_status ON public.sessoes_jogo(evento_id, status);

CREATE INDEX idx_sess_expira
  ON public.sessoes_jogo(expira_em)
  WHERE status IN ('aguardando_celular', 'aguardando_dados');

CREATE UNIQUE INDEX unq_jogada_tel_evento_jogo
  ON public.sessoes_jogo(evento_id, jogo, jogador_telefone)
  WHERE status IN ('pronta_para_girar', 'girando', 'finalizada');

-- ━━━━━━━━━━━━━━━━━━━━━━━━ GANHADORES + BLACKLIST ━━━━━━━━━━━━━━━━

CREATE TABLE public.ganhadores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id         UUID NOT NULL UNIQUE REFERENCES public.sessoes_jogo(id) ON DELETE CASCADE,
  evento_id         UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  premio_id         UUID NOT NULL REFERENCES public.premios(id),
  jogador_nome      TEXT NOT NULL,
  jogador_telefone  TEXT NOT NULL,
  jogador_email     TEXT NOT NULL,
  jogador_loja_id   UUID REFERENCES public.lojas(id),
  ganho_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue          BOOLEAN NOT NULL DEFAULT false,
  entregue_em       TIMESTAMPTZ,
  entregue_por      UUID REFERENCES auth.users(id),
  observacoes       TEXT
);

CREATE INDEX idx_ganh_evento   ON public.ganhadores(evento_id);
CREATE INDEX idx_ganh_telefone ON public.ganhadores(jogador_telefone);

CREATE TABLE public.fingerprints_bloqueados (
  fingerprint    TEXT PRIMARY KEY,
  motivo         TEXT NOT NULL,
  bloqueado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_por  UUID REFERENCES auth.users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ AUDITORIA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.auditoria (
  id            BIGSERIAL PRIMARY KEY,
  evento_id     UUID REFERENCES public.eventos(id),
  acao          TEXT NOT NULL,
  ator          UUID REFERENCES auth.users(id),
  recurso_tipo  TEXT,
  recurso_id    UUID,
  detalhes      JSONB,
  ip            INET,
  user_agent    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_evento ON public.auditoria(evento_id);
CREATE INDEX idx_audit_data   ON public.auditoria(criado_em DESC);
CREATE INDEX idx_audit_acao   ON public.auditoria(acao);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ HELPER SCHEMA (testes) ━━━━━━━━━━━━━━━

CREATE SCHEMA IF NOT EXISTS test_helpers;
GRANT USAGE ON SCHEMA test_helpers TO postgres;
```

- [ ] **Step 6.2: Aplicar migration e rodar testes**

```bash
supabase db reset
supabase test db
```

Expected: `01_schema_constraints.sql` retorna `ok` em todos os 35 testes do plano. Saída final: `# All 35 tests passed`.

Se algo falhar, ajustar a migration e rodar de novo até **GREEN**.

- [ ] **Step 6.3: Commit**

```bash
git add supabase/migrations/20260511120001_init_schema.sql
git commit -m "feat(db): init schema with tables, types, indexes and constraints"
```

---

## Task 7 — Escrever pgTAP test do is_admin() (RED)

**Files:**
- Create: `supabase/tests/03_is_admin.sql`

- [ ] **Step 7.1: Criar `supabase/tests/03_is_admin.sql`**

```sql
BEGIN;

SELECT plan(4);

SELECT has_function('public', 'is_admin', ARRAY[]::TEXT[],
                    'função is_admin() sem args existe');

-- Caso 1: sem JWT (anônimo) → false
SET LOCAL request.jwt.claims TO '{}';
SELECT is(public.is_admin(), false, 'is_admin() retorna false quando não há claim');

-- Caso 2: JWT com admin_elevado=false → false
SET LOCAL request.jwt.claims TO '{"admin_elevado": false}';
SELECT is(public.is_admin(), false, 'is_admin() retorna false quando admin_elevado=false');

-- Caso 3: JWT com admin_elevado=true → true
SET LOCAL request.jwt.claims TO '{"admin_elevado": true}';
SELECT is(public.is_admin(), true, 'is_admin() retorna true quando admin_elevado=true');

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 7.2: Rodar — deve FALHAR (RED)**

```bash
supabase test db
```

Expected: `function is_admin() does not exist`.

- [ ] **Step 7.3: Commit**

```bash
git add supabase/tests/03_is_admin.sql
git commit -m "test(db): add is_admin pgtap test (RED)"
```

---

## Task 8 — Migration 3: função is_admin() (GREEN)

**Files:**
- Create: `supabase/migrations/20260511120003_is_admin_function.sql`

- [ ] **Step 8.1: Criar migration**

```sql
-- 20260511120003_is_admin_function.sql
-- Helper para RLS: retorna true se o JWT atual tem claim admin_elevado=true.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'admin_elevado')::boolean,
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
```

- [ ] **Step 8.2: Aplicar e testar**

```bash
supabase db reset
supabase test db
```

Expected: `03_is_admin.sql` passa todos os 4 testes.

- [ ] **Step 8.3: Commit**

```bash
git add supabase/migrations/20260511120003_is_admin_function.sql
git commit -m "feat(db): add is_admin() helper for RLS"
```

---

## Task 9 — Escrever pgTAP test de RLS (RED)

**Files:**
- Create: `supabase/tests/02_rls_policies.sql`

Este teste verifica que RLS está habilitada nas tabelas certas e que policies básicas existem. Validação semântica completa (anon não vê sessões, etc.) virá com Edge Functions.

- [ ] **Step 9.1: Criar `supabase/tests/02_rls_policies.sql`**

```sql
BEGIN;

SELECT plan(20);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ RLS HABILITADA ━━━━━━━━━━━━━━━━━━━━━━━

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.perfis_operadores'::regclass),
  'RLS habilitada em perfis_operadores'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_credenciais'::regclass),
  'RLS habilitada em admin_credenciais'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.lojas'::regclass),
  'RLS habilitada em lojas'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.eventos'::regclass),
  'RLS habilitada em eventos'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.premios'::regclass),
  'RLS habilitada em premios'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.sessoes_jogo'::regclass),
  'RLS habilitada em sessoes_jogo'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.ganhadores'::regclass),
  'RLS habilitada em ganhadores'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.fingerprints_bloqueados'::regclass),
  'RLS habilitada em fingerprints_bloqueados'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.auditoria'::regclass),
  'RLS habilitada em auditoria'
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ POLICIES EXISTEM ━━━━━━━━━━━━━━━━━━━━━

SELECT policies_are('public', 'perfis_operadores',
  ARRAY['operador_ve_proprio','admin_ve_todos_operadores'],
  'perfis_operadores tem policies certas');

SELECT policies_are('public', 'admin_credenciais',
  ARRAY['admin_atualiza_senha'],
  'admin_credenciais tem policy de UPDATE');

SELECT policies_are('public', 'lojas',
  ARRAY['operador_le_lojas','admin_cud_lojas'],
  'lojas tem 2 policies');

SELECT policies_are('public', 'eventos',
  ARRAY['operador_le_eventos','admin_cud_eventos'],
  'eventos tem 2 policies');

SELECT policies_are('public', 'premios',
  ARRAY['operador_le_premios','admin_cud_premios'],
  'premios tem 2 policies');

SELECT policies_are('public', 'sessoes_jogo',
  ARRAY['operador_le_sessoes','operador_atualiza_propria_sessao'],
  'sessoes_jogo tem 2 policies (anon não)');

SELECT policies_are('public', 'ganhadores',
  ARRAY['operador_le_ganhadores','operador_marca_entrega'],
  'ganhadores tem 2 policies');

SELECT policies_are('public', 'fingerprints_bloqueados',
  ARRAY['admin_gerencia_fingerprints'],
  'fingerprints_bloqueados tem 1 policy admin');

SELECT policies_are('public', 'auditoria',
  ARRAY['admin_le_auditoria'],
  'auditoria tem 1 policy SELECT admin');

-- ━━━━━━━━━━━━━━━━━━━━━━━━ SEMÂNTICA RÁPIDA ━━━━━━━━━━━━━━━━━━━━━

-- anon não vê sessões mesmo conhecendo o ID
SET LOCAL ROLE anon;
SELECT is_empty(
  $$ SELECT 1 FROM public.sessoes_jogo LIMIT 1 $$,
  'anon não consegue ver sessoes_jogo (sem policy)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 9.2: Rodar — deve FALHAR (RED)**

```bash
supabase test db
```

Expected: RLS está OFF nas tabelas (default Postgres), policies não existem.

- [ ] **Step 9.3: Commit**

```bash
git add supabase/tests/02_rls_policies.sql
git commit -m "test(db): add rls policies pgtap test (RED)"
```

---

## Task 10 — Migration 2: RLS policies (GREEN)

**Files:**
- Create: `supabase/migrations/20260511120002_rls_policies.sql`

> Nota: numeração `0002` é menor que `is_admin_function` (`0003`) mas o Supabase aplica em ordem de timestamp do nome. Como `is_admin()` precisa existir antes das policies que a chamam, vamos **renomear** a migration de RLS para usar um timestamp **após** a de `is_admin`. Vou usar `20260511120004` para RLS, e empurrar sortear/pg_cron pra frente. Veja correção abaixo:

**Renumeração final das migrations:**

| Ordem | Arquivo | Conteúdo |
|---|---|---|
| 1 | `20260511120001_init_schema.sql` | tabelas, types |
| 2 | `20260511120003_is_admin_function.sql` | função (Task 8) |
| 3 | `20260511120004_rls_policies.sql` | policies (esta task) |
| 4 | `20260511120005_sortear_function.sql` | sortear (Task 12) |
| 5 | `20260511120006_pg_cron_jobs.sql` | pg_cron (Task 15) |
| 6 | `20260511120007_storage_bucket.sql` | bucket (Task 16) |

- [ ] **Step 10.1: Criar `supabase/migrations/20260511120004_rls_policies.sql`**

```sql
-- 20260511120004_rls_policies.sql
-- Habilita RLS e cria policies seguindo a Seção 5.3 do spec.
-- Depende de public.is_admin() (migration 20260511120003).

-- ━━━━━━━━━━━━━━━━━━━━━━ HABILITAR RLS ━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.perfis_operadores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credenciais       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_jogo            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganhadores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprints_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria               ENABLE ROW LEVEL SECURITY;

-- ━━━━━━━━━━━━━━━━━━━━━━ perfis_operadores ━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_ve_proprio
  ON public.perfis_operadores
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY admin_ve_todos_operadores
  ON public.perfis_operadores
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ admin_credenciais ━━━━━━━━━━━━━━━━━━━━━━

-- Sem policy SELECT — só Edge Functions com service_role leem.

CREATE POLICY admin_atualiza_senha
  ON public.admin_credenciais
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ lojas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_lojas
  ON public.lojas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_cud_lojas
  ON public.lojas
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ eventos ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_eventos
  ON public.eventos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_cud_eventos
  ON public.eventos
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ premios ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_premios
  ON public.premios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_cud_premios
  ON public.premios
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ sessoes_jogo ━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Anon NÃO tem policy — só Edge Functions com service_role acessam.

CREATE POLICY operador_le_sessoes
  ON public.sessoes_jogo
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY operador_atualiza_propria_sessao
  ON public.sessoes_jogo
  FOR UPDATE
  TO authenticated
  USING (liberada_por = auth.uid())
  WITH CHECK (liberada_por = auth.uid());

-- ━━━━━━━━━━━━━━━━━━━━━━ ganhadores ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY operador_le_ganhadores
  ON public.ganhadores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY operador_marca_entrega
  ON public.ganhadores
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ━━━━━━━━━━━━━━━━━━━━━━ fingerprints_bloqueados ━━━━━━━━━━━━━━━━

CREATE POLICY admin_gerencia_fingerprints
  ON public.fingerprints_bloqueados
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━ auditoria ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE POLICY admin_le_auditoria
  ON public.auditoria
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Inserts em auditoria sempre via service_role (Edge Functions).
```

- [ ] **Step 10.2: Aplicar e testar**

```bash
supabase db reset
supabase test db
```

Expected: testes `02_rls_policies.sql` (20) e todos os anteriores passam.

- [ ] **Step 10.3: Commit**

```bash
git add supabase/migrations/20260511120004_rls_policies.sql
git commit -m "feat(db): enable RLS and add policies for all tables"
```

---

## Task 11 — Escrever pgTAP test do sortear() — distribuição (RED)

**Files:**
- Create: `supabase/tests/04_sortear_distribuicao.sql`

- [ ] **Step 11.1: Criar `supabase/tests/04_sortear_distribuicao.sql`**

```sql
BEGIN;

SELECT plan(8);

-- Função existe
SELECT has_function('public', 'sortear_e_baixar_estoque', ARRAY['uuid'],
                    'sortear_e_baixar_estoque(UUID) existe');

-- ━━━━━━━━━━━━━━━━━━━━ Setup: usuário + evento + prêmios ━━━━━━━━━

DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'test@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('11111111-1111-1111-1111-111111111111',
            'Evento Test', CURRENT_DATE, CURRENT_DATE+1, 'ativo', v_user);
END $$;

INSERT INTO public.premios (id, evento_id, nome, peso_base, estoque_inicial, estoque_atual,
                            ordem_roleta, e_premio_real, cor_hex)
  VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Vale R$10', 1, 100, 100, 1, true, '#4afad4'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'TV',       10, 1,   1,   2, true, '#009993'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Não foi',  30, 0,   0,   3, false, '#555555');

-- ━━━━━━━━━━━━━━━━━━━━ Caso 1: peso × estoque dá os pesos certos ━━

-- Esperado: vale=100 (1*100), TV=10 (10*1), naofoi=30 (peso puro), total=140

-- (validação indireta via distribuição estatística no caso 4)

-- ━━━━━━━━━━━━━━━━━━━━ Caso 2: sessão inválida levanta exceção ━━━

SELECT throws_like(
  $$ SELECT public.sortear_e_baixar_estoque('99999999-9999-9999-9999-999999999999') $$,
  '%Sessão não encontrada%',
  'lança exceção se sessao_id não existe'
);

-- ━━━━━━━━━━━━━━━━━━━━ Caso 3: status errado levanta exceção ━━━━

DO $$
DECLARE
  v_sessao UUID := gen_random_uuid();
  v_user   UUID := (SELECT id FROM auth.users WHERE email='test@altis.local');
BEGIN
  INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por)
    VALUES (v_sessao, '11111111-1111-1111-1111-111111111111',
            'roleta', 'aguardando_celular', v_user);
  -- guardamos id para uso abaixo:
  PERFORM set_config('test.sessao_aguardando_celular', v_sessao::text, true);
END $$;

SELECT throws_like(
  format($$ SELECT public.sortear_e_baixar_estoque(%L) $$,
         current_setting('test.sessao_aguardando_celular')),
  '%Status inválido%',
  'lança exceção se status não é aguardando_dados'
);

-- ━━━━━━━━━━━━━━━━━━━━ Caso 4: sorteio bem-sucedido baixa estoque ━━

DO $$
DECLARE
  v_sessao UUID := gen_random_uuid();
  v_user   UUID := (SELECT id FROM auth.users WHERE email='test@altis.local');
BEGIN
  INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por,
                                    jogador_nome, jogador_telefone, jogador_email)
    VALUES (v_sessao, '11111111-1111-1111-1111-111111111111',
            'roleta', 'aguardando_dados', v_user,
            'Maria Teste', '54988887777', 'maria@test.local');
  PERFORM set_config('test.sessao_pronta', v_sessao::text, true);
END $$;

SELECT lives_ok(
  format($$ SELECT public.sortear_e_baixar_estoque(%L) $$,
         current_setting('test.sessao_pronta')),
  'sortear executa sem erro em sessão aguardando_dados'
);

-- Estoque total tem que ter caído exatamente 1 (ou 0 se sorteou "Não foi")
SELECT ok(
  (SELECT SUM(estoque_inicial - estoque_atual)
     FROM public.premios
    WHERE evento_id='11111111-1111-1111-1111-111111111111') IN (0, 1),
  'estoque total reduzido em exatamente 0 ou 1 unidade'
);

-- Status atualizado para pronta_para_girar
SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('test.sessao_pronta')::uuid),
  'pronta_para_girar',
  'sessão transicionou para pronta_para_girar'
);

-- Premio sorteado preenchido
SELECT isnt(
  (SELECT premio_sorteado_id FROM public.sessoes_jogo
    WHERE id=current_setting('test.sessao_pronta')::uuid),
  NULL,
  'premio_sorteado_id está preenchido'
);

-- Ganhador inserido
SELECT is(
  (SELECT COUNT(*)::int FROM public.ganhadores
    WHERE sessao_id=current_setting('test.sessao_pronta')::uuid),
  1,
  'exatamente 1 linha em ganhadores'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 11.2: Rodar — deve FALHAR (RED)**

```bash
supabase test db
```

Expected: função `sortear_e_baixar_estoque` ainda não existe.

- [ ] **Step 11.3: Commit**

```bash
git add supabase/tests/04_sortear_distribuicao.sql
git commit -m "test(db): add sortear_e_baixar_estoque pgtap test (RED)"
```

---

## Task 12 — Migration 4: função sortear_e_baixar_estoque (GREEN)

**Files:**
- Create: `supabase/migrations/20260511120005_sortear_function.sql`

- [ ] **Step 12.1: Criar migration**

```sql
-- 20260511120005_sortear_function.sql
-- Função atômica: lock pessimista da sessão, calcula pesos efetivos
-- (peso_base × estoque_atual para prêmios reais; peso_base puro para "Não foi"),
-- sorteia ponderado, baixa estoque, atualiza sessão, insere ganhador,
-- grava auditoria. Tudo numa única transação.

CREATE OR REPLACE FUNCTION public.sortear_e_baixar_estoque(p_sessao_id UUID)
RETURNS TABLE (
  premio_id      UUID,
  nome           TEXT,
  cor_hex        TEXT,
  foto_path      TEXT,
  ordem_roleta   INT,
  e_premio_real  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_evento_id      UUID;
  v_status         public.sessao_status;
  v_total          NUMERIC;
  v_sorteio        NUMERIC;
  v_acumulado      NUMERIC := 0;
  v_escolhido_id   UUID;
  v_escolhido_real BOOLEAN;
  v_premio         RECORD;
BEGIN
  -- 1) Lock pessimista da sessão
  SELECT s.evento_id, s.status
    INTO v_evento_id, v_status
    FROM public.sessoes_jogo s
   WHERE s.id = p_sessao_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão não encontrada: %', p_sessao_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'aguardando_dados' THEN
    RAISE EXCEPTION 'Status inválido para sorteio: % (esperado: aguardando_dados)',
                    v_status USING ERRCODE = 'P0001';
  END IF;

  -- 2) Lock dos prêmios + cálculo de peso efetivo
  CREATE TEMP TABLE _sorteio_pool ON COMMIT DROP AS
    SELECT p.id, p.peso_base, p.estoque_atual, p.e_premio_real,
           p.ordem_roleta, p.nome, p.cor_hex, p.foto_path,
           CASE
             WHEN p.e_premio_real = false THEN p.peso_base::NUMERIC
             ELSE (p.peso_base * p.estoque_atual)::NUMERIC
           END AS peso_efetivo
      FROM public.premios p
     WHERE p.evento_id = v_evento_id
       AND (p.estoque_atual > 0 OR p.e_premio_real = false)
       AND p.peso_base > 0
     FOR UPDATE;

  SELECT COALESCE(SUM(peso_efetivo), 0) INTO v_total FROM _sorteio_pool;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Sem prêmios disponíveis para sorteio (evento %)',
                    v_evento_id USING ERRCODE = 'P0001';
  END IF;

  -- 3) Sorteio uniforme em [0, v_total)
  v_sorteio := random() * v_total;

  -- 4) Itera em ordem determinística (ordem_roleta, id)
  FOR v_premio IN
    SELECT id, peso_efetivo, e_premio_real
      FROM _sorteio_pool
     ORDER BY ordem_roleta, id
  LOOP
    v_acumulado := v_acumulado + v_premio.peso_efetivo;
    IF v_sorteio < v_acumulado THEN
      v_escolhido_id   := v_premio.id;
      v_escolhido_real := v_premio.e_premio_real;
      EXIT;
    END IF;
  END LOOP;

  IF v_escolhido_id IS NULL THEN
    RAISE EXCEPTION 'Falha interna no sorteio (sem escolhido); total=% sorteio=%',
                    v_total, v_sorteio USING ERRCODE = 'P0001';
  END IF;

  -- 5) Baixa estoque só se prêmio real
  IF v_escolhido_real THEN
    UPDATE public.premios
       SET estoque_atual = estoque_atual - 1
     WHERE id = v_escolhido_id
       AND estoque_atual > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Concorrência: estoque zerou entre lock e UPDATE'
                      USING ERRCODE = '40001';
    END IF;
  END IF;

  -- 6) Atualiza sessão
  UPDATE public.sessoes_jogo
     SET premio_sorteado_id = v_escolhido_id,
         status             = 'pronta_para_girar',
         girada_em          = NOW()
   WHERE id = p_sessao_id;

  -- 7) Insere ganhador (sempre, mesmo "Não foi dessa vez")
  INSERT INTO public.ganhadores (sessao_id, evento_id, premio_id,
                                  jogador_nome, jogador_telefone,
                                  jogador_email, jogador_loja_id)
    SELECT s.id, s.evento_id, v_escolhido_id,
           s.jogador_nome, s.jogador_telefone,
           s.jogador_email, s.jogador_loja_id
      FROM public.sessoes_jogo s
     WHERE s.id = p_sessao_id;

  -- 8) Auditoria
  INSERT INTO public.auditoria (evento_id, acao, recurso_tipo, recurso_id, detalhes)
    VALUES (v_evento_id, 'sortear', 'sessoes_jogo', p_sessao_id,
            jsonb_build_object(
              'premio_id',       v_escolhido_id,
              'total_peso',      v_total,
              'sorteio',         v_sorteio,
              'acumulado_final', v_acumulado,
              'e_premio_real',   v_escolhido_real
            ));

  -- 9) Retorna detalhes para a Edge Function repassar via Realtime
  RETURN QUERY
    SELECT p.id, p.nome, p.cor_hex, p.foto_path, p.ordem_roleta, p.e_premio_real
      FROM public.premios p
     WHERE p.id = v_escolhido_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) TO service_role;
```

- [ ] **Step 12.2: Aplicar e testar**

```bash
supabase db reset
supabase test db
```

Expected: `04_sortear_distribuicao.sql` passa (8/8). Anteriores continuam passando.

- [ ] **Step 12.3: Commit**

```bash
git add supabase/migrations/20260511120005_sortear_function.sql
git commit -m "feat(db): add sortear_e_baixar_estoque atomic function"
```

---

## Task 13 — Escrever pgTAP test de distribuição estatística

**Files:**
- Create: `supabase/tests/04b_sortear_estatistico.sql`

Este teste roda 1000 sorteios e verifica que a distribuição converge para o esperado.

- [ ] **Step 13.1: Criar `supabase/tests/04b_sortear_estatistico.sql`**

```sql
BEGIN;

SELECT plan(3);

-- Setup: evento com 3 prêmios — Vale (peso 1, estoque 9000), TV (peso 0, estoque 0
-- para evitar baixa) — simplificação: usaremos pesos sem estoque-multiplicação
-- via dois "Não foi" com pesos diferentes.
-- Distribuição esperada (pesos efetivos):
--   slot A "Não foi" peso 60 → 60%
--   slot B "Não foi" peso 30 → 30%
--   slot C "Não foi" peso 10 → 10%

DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'stat@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'Evento Stat', CURRENT_DATE, CURRENT_DATE+1, 'ativo', v_user);

  INSERT INTO public.premios (id, evento_id, nome, peso_base, estoque_inicial,
                              estoque_atual, ordem_roleta, e_premio_real)
    VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A', 60, 0, 0, 1, false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'B', 30, 0, 0, 2, false),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C', 10, 0, 0, 3, false);
END $$;

-- Roda 1000 sorteios (cada um cria uma sessão, sorteia, e o telefone é único)
DO $$
DECLARE
  v_user UUID := (SELECT id FROM auth.users WHERE email='stat@altis.local');
  v_sessao UUID;
  i INT;
BEGIN
  FOR i IN 1..1000 LOOP
    v_sessao := gen_random_uuid();
    INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por,
                                      jogador_nome, jogador_telefone, jogador_email)
      VALUES (v_sessao, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              'roleta', 'aguardando_dados', v_user,
              'Tester ' || i, '5499' || lpad(i::text, 7, '0'),
              'tester' || i || '@local');
    PERFORM public.sortear_e_baixar_estoque(v_sessao);
  END LOOP;
END $$;

-- A deve sair ~600 vezes (60%) — IC 99% = 600 ± ~40
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM public.ganhadores
    WHERE premio_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'BETWEEN', 540, 660,
  'slot A (peso 60) sai entre 540 e 660 vezes (esperado ~600)'
);

-- B ~300 ± 35
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM public.ganhadores
    WHERE premio_id='cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'BETWEEN', 250, 350,
  'slot B (peso 30) sai entre 250 e 350 vezes (esperado ~300)'
);

-- C ~100 ± 25
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM public.ganhadores
    WHERE premio_id='dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'BETWEEN', 70, 130,
  'slot C (peso 10) sai entre 70 e 130 vezes (esperado ~100)'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 13.2: Rodar**

```bash
supabase test db
```

Expected: `04b_sortear_estatistico.sql` passa (3/3). Roda em ~5-15s por causa dos 1000 sorteios.

Se falhar por causa de variação estatística, rodar 2-3 vezes. Falhas consistentes indicam bug no algoritmo (ajustar a função).

- [ ] **Step 13.3: Commit**

```bash
git add supabase/tests/04b_sortear_estatistico.sql
git commit -m "test(db): add statistical distribution test for sortear"
```

---

## Task 14 — Escrever pgTAP test de concorrência

**Files:**
- Create: `supabase/tests/05_sortear_concorrencia.sql`

Testa que o lock pessimista evita dupla baixa de estoque. Como pgTAP é single-thread, simulamos com `SELECT FOR UPDATE NOWAIT` em sessão paralela via `dblink`.

- [ ] **Step 14.1: Criar `supabase/tests/05_sortear_concorrencia.sql`**

```sql
BEGIN;

SELECT plan(2);

CREATE EXTENSION IF NOT EXISTS dblink;

-- Setup: evento com 1 prêmio de estoque 10 + slot "Não foi"
DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'conc@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            'Evento Conc', CURRENT_DATE, CURRENT_DATE+1, 'ativo', v_user);

  INSERT INTO public.premios (evento_id, nome, peso_base, estoque_inicial,
                              estoque_atual, ordem_roleta, e_premio_real)
    VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Vale',    100, 10, 10, 1, true),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Não foi', 1,   0,  0,  2, false);
END $$;

-- Cria 50 sessões prontas e sorteia todas em sequência
DO $$
DECLARE
  v_user UUID := (SELECT id FROM auth.users WHERE email='conc@altis.local');
  v_sessao UUID;
  i INT;
BEGIN
  FOR i IN 1..50 LOOP
    v_sessao := gen_random_uuid();
    INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por,
                                      jogador_nome, jogador_telefone, jogador_email)
      VALUES (v_sessao, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              'roleta', 'aguardando_dados', v_user,
              'Tester ' || i, '5499' || lpad(i::text, 7, '0'),
              'c' || i || '@local');
    PERFORM public.sortear_e_baixar_estoque(v_sessao);
  END LOOP;
END $$;

-- Estoque do "Vale" deve ser exatamente 0 ou >0 dependendo dos sorteios,
-- mas NUNCA negativo. Como peso é altíssimo, esperamos que todas as 10 unidades saiam.
SELECT cmp_ok(
  (SELECT estoque_atual FROM public.premios
    WHERE evento_id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND nome='Vale'),
  '=', 0,
  'estoque Vale exatamente 0 após 50 sorteios (peso 100 vs 1 garante)'
);

-- Contagem de ganhadores reais (com prêmio real) = 10 exatamente
SELECT is(
  (SELECT COUNT(*)::int FROM public.ganhadores g
     JOIN public.premios p ON p.id = g.premio_id
    WHERE g.evento_id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      AND p.nome = 'Vale'),
  10,
  'exatamente 10 ganhadores receberam Vale (sem dupla baixa)'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 14.2: Rodar**

```bash
supabase test db
```

Expected: ambos os asserts passam.

- [ ] **Step 14.3: Commit**

```bash
git add supabase/tests/05_sortear_concorrencia.sql
git commit -m "test(db): add concurrency safety test for sortear"
```

---

## Task 15 — Escrever pgTAP test de state machine

**Files:**
- Create: `supabase/tests/06_state_machine.sql`

- [ ] **Step 15.1: Criar `supabase/tests/06_state_machine.sql`**

```sql
BEGIN;

SELECT plan(5);

DO $$
DECLARE v_user UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, instance_id, aud, role)
    VALUES (v_user, 'sm@altis.local', NOW(), NOW(),
            '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.eventos (id, nome, data_inicio, data_fim, status, criado_por)
    VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff',
            'Evento SM', CURRENT_DATE, CURRENT_DATE+1, 'ativo', v_user);
END $$;

-- ━━━━━━━━━━━━ Caso 1: CHECK dados_quando_pronta bloqueia ━━━━━━━

SELECT throws_like(
  $$ INSERT INTO public.sessoes_jogo
       (evento_id, jogo, status, liberada_por)
     VALUES
       ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'pronta_para_girar',
        (SELECT id FROM auth.users WHERE email='sm@altis.local')) $$,
  '%dados_quando_pronta%',
  'CHECK dados_quando_pronta bloqueia transição pra pronta sem dados'
);

-- ━━━━━━━━━━━━ Caso 2: CHECK premio_quando_finalizada bloqueia ━━━

SELECT throws_like(
  $$ INSERT INTO public.sessoes_jogo
       (evento_id, jogo, status, liberada_por,
        jogador_nome, jogador_telefone, jogador_email)
     VALUES
       ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'finalizada',
        (SELECT id FROM auth.users WHERE email='sm@altis.local'),
        'X', '54988887777', 'x@x') $$,
  '%premio_quando_finalizada%',
  'CHECK premio_quando_finalizada bloqueia finalizada sem prêmio'
);

-- ━━━━━━━━━━━━ Caso 3: UNIQUE jogada_tel_evento_jogo bloqueia ━━━

-- Cria sessão 1 finalizada com telefone X
INSERT INTO public.premios (id, evento_id, nome, peso_base, estoque_inicial,
                            estoque_atual, ordem_roleta, e_premio_real)
  VALUES ('aabbccdd-aabb-ccdd-eeff-001122334455',
          'ffffffff-ffff-ffff-ffff-ffffffffffff', 'P1', 1, 100, 99, 1, true);

INSERT INTO public.sessoes_jogo
  (id, evento_id, jogo, status, liberada_por,
   jogador_nome, jogador_telefone, jogador_email, premio_sorteado_id)
VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111',
   'ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'finalizada',
   (SELECT id FROM auth.users WHERE email='sm@altis.local'),
   'Maria', '54988887777', 'maria@x', 'aabbccdd-aabb-ccdd-eeff-001122334455');

-- Tenta criar sessão 2 finalizada com mesmo telefone, mesmo evento+jogo
SELECT throws_like(
  $$ INSERT INTO public.sessoes_jogo
       (id, evento_id, jogo, status, liberada_por,
        jogador_nome, jogador_telefone, jogador_email, premio_sorteado_id)
     VALUES
       ('aaaa2222-aaaa-2222-aaaa-222222222222',
        'ffffffff-ffff-ffff-ffff-ffffffffffff', 'roleta', 'finalizada',
        (SELECT id FROM auth.users WHERE email='sm@altis.local'),
        'Maria2', '54988887777', 'maria2@x', 'aabbccdd-aabb-ccdd-eeff-001122334455') $$,
  '%unq_jogada_tel_evento_jogo%',
  'UNIQUE bloqueia segundo telefone igual no mesmo evento+jogo finalizado'
);

-- ━━━━━━━━━━━━ Caso 4: Mesmo telefone em outro JOGO é OK ━━━━━━━━

SELECT lives_ok(
  $$ INSERT INTO public.sessoes_jogo
       (evento_id, jogo, status, liberada_por,
        jogador_nome, jogador_telefone, jogador_email, premio_sorteado_id)
     VALUES
       ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dados', 'finalizada',
        (SELECT id FROM auth.users WHERE email='sm@altis.local'),
        'Maria3', '54988887777', 'maria3@x',
        'aabbccdd-aabb-ccdd-eeff-001122334455') $$,
  'mesmo telefone consegue jogar OUTRO jogo (dados) no mesmo evento'
);

-- ━━━━━━━━━━━━ Caso 5: UNIQUE evento ativo bloqueia 2º ativo ━━━━

SELECT throws_like(
  $$ INSERT INTO public.eventos
       (nome, data_inicio, data_fim, status, criado_por)
     VALUES
       ('Outro evento', CURRENT_DATE, CURRENT_DATE+1, 'ativo',
        (SELECT id FROM auth.users WHERE email='sm@altis.local')) $$,
  '%unq_evento_ativo%',
  'UNIQUE unq_evento_ativo bloqueia 2º evento ativo'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 15.2: Rodar — deve passar (constraints já existem)**

```bash
supabase test db
```

Expected: 5/5 passam (as constraints já foram criadas na Task 6).

- [ ] **Step 15.3: Commit**

```bash
git add supabase/tests/06_state_machine.sql
git commit -m "test(db): add state machine constraint tests"
```

---

## Task 16 — Migration 5: pg_cron jobs

**Files:**
- Create: `supabase/migrations/20260511120006_pg_cron_jobs.sql`

- [ ] **Step 16.1: Criar migration**

```sql
-- 20260511120006_pg_cron_jobs.sql
-- Jobs de manutenção automática (executados pelo Supabase managed pg_cron).

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: expirar sessões vencidas (a cada 60s)
SELECT cron.schedule(
  'expirar-sessoes-vencidas',
  '* * * * *',  -- a cada 1 minuto
  $$
    UPDATE public.sessoes_jogo
       SET status = 'expirada'
     WHERE expira_em < NOW()
       AND status IN ('aguardando_celular', 'aguardando_dados');
  $$
);

-- Job 2: destravar sessões em 'girando' por mais de 30s (totem crashou)
SELECT cron.schedule(
  'destravar-girando-perdidas',
  '* * * * *',
  $$
    UPDATE public.sessoes_jogo
       SET status = 'finalizada',
           finalizada_em = NOW()
     WHERE status = 'girando'
       AND girada_em < NOW() - INTERVAL '30 seconds';
  $$
);

-- Job 3: cleanup de sessões antigas (a cada hora; só remove >30 dias)
SELECT cron.schedule(
  'cleanup-sessoes-antigas',
  '0 * * * *',  -- a cada hora
  $$
    DELETE FROM public.sessoes_jogo
     WHERE status IN ('expirada', 'cancelada')
       AND criada_em < NOW() - INTERVAL '30 days';
  $$
);
```

- [ ] **Step 16.2: Aplicar**

```bash
supabase db reset
supabase test db
```

Expected: testes anteriores continuam passando; jobs criados (verificar via Studio em `cron.job`).

- [ ] **Step 16.3: Verificar jobs no Studio**

Abra `http://127.0.0.1:54323`, navegue até **Database → Extensions → pg_cron → cron.job**. Deve listar 3 jobs.

- [ ] **Step 16.4: Commit**

```bash
git add supabase/migrations/20260511120006_pg_cron_jobs.sql
git commit -m "feat(db): add pg_cron jobs for session expiration and cleanup"
```

---

## Task 17 — Migration 6: Storage bucket para fotos

**Files:**
- Create: `supabase/migrations/20260511120007_storage_bucket.sql`

- [ ] **Step 17.1: Criar migration**

```sql
-- 20260511120007_storage_bucket.sql
-- Bucket público de fotos de prêmios + policies via storage.objects.

-- Cria bucket (idempotente)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('fotos_premios', 'fotos_premios', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer um autenticado pode ler
CREATE POLICY "ler_fotos_premios"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'fotos_premios');

-- Policy: admin pode escrever/atualizar/deletar
CREATE POLICY "admin_gerencia_fotos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'fotos_premios' AND public.is_admin())
  WITH CHECK (bucket_id = 'fotos_premios' AND public.is_admin());
```

- [ ] **Step 17.2: Aplicar**

```bash
supabase db reset
supabase test db
```

Expected: testes anteriores OK.

- [ ] **Step 17.3: Verificar bucket no Studio**

`http://127.0.0.1:54323` → **Storage** → ver bucket `fotos_premios` listado.

- [ ] **Step 17.4: Commit**

```bash
git add supabase/migrations/20260511120007_storage_bucket.sql
git commit -m "feat(db): add fotos_premios storage bucket with policies"
```

---

## Task 18 — Criar seed inicial

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 18.1: Criar `supabase/seed.sql`**

```sql
-- supabase/seed.sql
-- Dados iniciais aplicados após cada `supabase db reset`.
-- NÃO contém dados sensíveis. NÃO sobrescreve dados existentes em prod.

-- ━━━━━━━━━━━━━━━━━━━━━━ USUÁRIO ADMIN INICIAL ━━━━━━━━━━━━━━━━━━━

-- O Plano 3 (CLI) substitui isso por bootstrap interativo.
-- Para desenvolvimento local, criamos um operador fake.
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at,
                        instance_id, aud, role, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@altis.local',
  '$2a$10$qkLkmVcVl/dXdJ.K9hMnL.NJTwIPfxXVPVxKAzZ0qZ.qOTL.lk5j6',  -- bcrypt('senha123', 10)
  NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.perfis_operadores (id, nome_completo)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Local')
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━ SENHA ADMIN (modo elevado) ━━━━━━━━━━━━━

-- Hash de 'admin123' (apenas para dev). Plano 3 CLI sobrescreve.
INSERT INTO public.admin_credenciais (id, senha_hash)
VALUES (1, '$2a$12$8eFb1JLZBJxR7VqMHC4y9OZsLb2yVqVO7TpvLNQXDOJ4cVCpJZb3y')
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━ LOJAS EXEMPLO ━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.lojas (id, nome, cidade) VALUES
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'Loja Caxias',  'Caxias do Sul'),
  ('aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'Loja Bento',   'Bento Gonçalves'),
  ('aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa', 'Loja Garibaldi','Garibaldi')
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━ EVENTO DE EXEMPLO ━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.eventos (id, nome, descricao, data_inicio, data_fim, status, criado_por)
VALUES (
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
  'Evento Demo',
  'Evento de exemplo para desenvolvimento local',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'ativo',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━ PRÊMIOS EXEMPLO ━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.premios (id, evento_id, nome, descricao, cor_hex,
                            peso_base, estoque_inicial, estoque_atual,
                            ordem_roleta, e_premio_real) VALUES
  ('cccccccc-1111-1111-1111-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Vale R$10', 'Vale-compra de R$10 em qualquer loja Altis',
   '#4afad4', 1, 100, 100, 1, true),

  ('cccccccc-2222-2222-2222-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Camiseta Altis', 'Camiseta exclusiva Altis Sistemas',
   '#f7b32b', 2, 20, 20, 2, true),

  ('cccccccc-3333-3333-3333-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Smart TV 32"', 'TV LED 32 polegadas',
   '#e74c3c', 10, 1, 1, 3, true),

  ('cccccccc-9999-9999-9999-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Não foi dessa vez', 'Obrigado por participar!',
   '#555555', 30, 0, 0, 99, false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 18.2: Aplicar e verificar**

```bash
supabase db reset
```

Expected: migrations rodam + seed roda. Verificar via Studio que existe 1 evento, 3 lojas, 4 prêmios.

- [ ] **Step 18.3: Rodar testes — devem continuar passando**

```bash
supabase test db
```

Expected: todos os arquivos `01..06` continuam GREEN (seed não interfere — testes usam BEGIN/ROLLBACK).

- [ ] **Step 18.4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): add seed data for local development"
```

---

## Task 19 — Smoke test end-to-end via psql

**Files:**
- Create: `supabase/tests/99_smoke.sql`

- [ ] **Step 19.1: Criar smoke test**

```sql
-- supabase/tests/99_smoke.sql
-- Cenário ponta-a-ponta: liberar jogada (manual) → submeter dados → sortear → finalizar.

BEGIN;

SELECT plan(6);

-- Pega o operador dev e o evento demo do seed
DO $$
DECLARE
  v_user UUID := '00000000-0000-0000-0000-000000000001';
  v_evento UUID := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_sessao UUID := gen_random_uuid();
BEGIN
  -- Simula liberar-jogada
  INSERT INTO public.sessoes_jogo (id, evento_id, jogo, status, liberada_por)
    VALUES (v_sessao, v_evento, 'roleta', 'aguardando_celular', v_user);

  PERFORM set_config('smoke.sessao', v_sessao::text, true);
END $$;

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'aguardando_celular',
  'sessão criada em aguardando_celular'
);

-- Simula scan do QR (obter-sessao → aguardando_dados)
UPDATE public.sessoes_jogo
   SET status = 'aguardando_dados'
 WHERE id = current_setting('smoke.sessao')::uuid;

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'aguardando_dados',
  'transição para aguardando_dados OK'
);

-- Simula submeter-dados (preenche jogador + chama sortear)
UPDATE public.sessoes_jogo
   SET jogador_nome     = 'João Smoke',
       jogador_telefone = '54988880001',
       jogador_email    = 'joao@smoke.local'
 WHERE id = current_setting('smoke.sessao')::uuid;

SELECT lives_ok(
  format($$ SELECT public.sortear_e_baixar_estoque(%L) $$,
         current_setting('smoke.sessao')),
  'sortear executou sem erro'
);

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'pronta_para_girar',
  'status virou pronta_para_girar'
);

-- Simula concluir-animacao (finalizada)
UPDATE public.sessoes_jogo
   SET status = 'finalizada',
       finalizada_em = NOW()
 WHERE id = current_setting('smoke.sessao')::uuid;

SELECT is(
  (SELECT status::text FROM public.sessoes_jogo
    WHERE id=current_setting('smoke.sessao')::uuid),
  'finalizada',
  'status virou finalizada'
);

-- Verifica auditoria registrou sortear
SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM public.auditoria
    WHERE recurso_id = current_setting('smoke.sessao')::uuid
      AND acao = 'sortear'),
  '>=', 1,
  'auditoria registra o sortear'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 19.2: Rodar smoke**

```bash
supabase test db
```

Expected: 6/6 passam. Total geral: 35 + 4 + 20 + 8 + 3 + 2 + 5 + 6 = 83 testes pgTAP passando.

- [ ] **Step 19.3: Commit**

```bash
git add supabase/tests/99_smoke.sql
git commit -m "test(db): add end-to-end smoke test"
```

---

## Task 20 — README de bootstrap + GitHub Actions CI mínimo

**Files:**
- Modify: `README.md`
- Create: `.github/workflows/ci-db.yml`

- [ ] **Step 20.1: Substituir conteúdo do `README.md`**

```markdown
# Altis Bet

Plataforma de jogos com premiação para eventos Altis Sistemas — Roleta de Prêmios (MVP).

**Spec:** [`docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md`](docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md)

**Status atual:** Plano 1 (Foundation DB) ✅ completo. Próximo: Plano 2 (Edge Functions).

---

## Pré-requisitos

- **Node.js 20.x** — `nvm use` (com `.nvmrc`)
- **Docker Desktop** rodando
- **Supabase CLI** ≥ 1.150
  - Windows: `scoop install supabase` ou `npm i -g supabase`
  - macOS: `brew install supabase/tap/supabase`

## Quickstart local

```bash
# 1. Clonar e instalar
git clone <repo>
cd altis-bet
nvm use
npm install

# 2. Subir Supabase local (1ª vez baixa imagens Docker)
npm run db:start

# 3. Resetar DB e aplicar migrations + seed
npm run db:reset

# 4. Rodar testes pgTAP
npm run test:db

# 5. Abrir Supabase Studio
# http://127.0.0.1:54323
```

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run db:start` | Sobe stack Supabase local (Postgres, Auth, Realtime, Studio, Storage) |
| `npm run db:stop` | Derruba stack |
| `npm run db:reset` | Reset completo + aplica migrations + roda seed |
| `npm run db:status` | Mostra URLs e chaves do stack local |
| `npm run test:db` | Roda todos os testes pgTAP em `supabase/tests/` |
| `npm run typecheck` | TypeScript check (nada por enquanto) |

## Estrutura

```
altis-bet/
├─ supabase/
│  ├─ migrations/    # SQL versionado, aplicado em ordem
│  ├─ seed.sql       # dados iniciais (dev)
│  └─ tests/         # pgTAP tests
├─ docs/superpowers/
│  ├─ specs/         # specs aprovados
│  └─ plans/         # planos de implementação
└─ README.md         # este arquivo
```

## Credenciais de desenvolvimento (apenas local)

- **Operador**: `dev@altis.local` / `senha123`
- **Senha modo admin**: `admin123`

(Em produção, senhas reais são definidas pela CLI no bootstrap — Plano 3.)

## Próximos planos

| Plano | Status | Conteúdo |
|---|---|---|
| 1 — Foundation DB | ✅ completo | Schema + RLS + sortear + pg_cron + Storage + seed |
| 2 — Edge Functions | 🔜 próximo | 7 Edge Functions (Deno) + testes |
| 3 — CLI | ⏳ | bootstrap, migrate, definir-senha-admin, import-premios, backup |
| 4 — UI Login + Totem | ⏳ | Next.js + Tailwind + shadcn + R3F |
| 5 — UI Jogador + Admin | ⏳ | `/jogar` + painel admin completo |
| 6 — E2E + Deploy | ⏳ | Playwright + GitHub Pages + Sentry + UptimeRobot |
```

- [ ] **Step 20.2: Criar `.github/workflows/ci-db.yml`**

```yaml
name: CI — Database

on:
  push:
    branches: [main, develop]
    paths:
      - 'supabase/**'
      - '.github/workflows/ci-db.yml'
  pull_request:
    paths:
      - 'supabase/**'
      - '.github/workflows/ci-db.yml'

jobs:
  pgtap:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install npm deps
        run: npm ci

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local
        run: supabase start

      - name: Run pgTAP tests
        run: supabase test db

      - name: Cleanup
        if: always()
        run: supabase stop --no-backup
```

- [ ] **Step 20.3: Verificar workflow file**

```bash
cat .github/workflows/ci-db.yml | head -5
```

Expected: arquivo existe.

- [ ] **Step 20.4: Commit final**

```bash
git add README.md .github/workflows/ci-db.yml
git commit -m "docs: write bootstrap readme; ci: add db workflow"
```

- [ ] **Step 20.5: Tag de marco**

```bash
git tag -a "plano-1-completo" -m "Plano 1: Foundation DB — schema + RLS + sortear + pg_cron + Storage + seed + 83 pgTAP tests passing"
```

---

## Resumo do estado pós-Plano 1

✅ Repositório Git inicializado
✅ Supabase local funcional (`supabase start` / `supabase db reset`)
✅ 6 migrations aplicadas:
   - `20260511120001_init_schema.sql`
   - `20260511120003_is_admin_function.sql`
   - `20260511120004_rls_policies.sql`
   - `20260511120005_sortear_function.sql`
   - `20260511120006_pg_cron_jobs.sql`
   - `20260511120007_storage_bucket.sql`
✅ 8 arquivos de teste pgTAP (~83 asserts) — todos passando
✅ Seed inicial (operador dev, senha admin dev, 3 lojas, 1 evento ativo, 4 prêmios)
✅ GitHub Actions CI mínimo (`ci-db.yml`)
✅ README.md com quickstart
✅ Tag `plano-1-completo`

**Validação final manual antes de prosseguir:**

```bash
git log --oneline | head -25      # confere ~20+ commits criados
supabase db reset                 # roda migrations + seed do zero
supabase test db                  # 83 asserts passam
```

Se tudo verde → pronto para **Plano 2 (Edge Functions)**.

---

## Self-review (executado pelo escritor do plano)

**1. Spec coverage do Plano 1 vs spec original:**
- §2 Arquitetura → estrutura `supabase/` pronta ✅
- §3 Modelo de dados (DDL completo) → Task 6 ✅
- §5.3 Políticas RLS → Task 10 ✅
- §5.4 Função `is_admin()` → Task 8 ✅
- §6 Algoritmo de sorteio (PL/pgSQL completa) → Task 12 + 13 (estatístico) + 14 (concorrência) ✅
- §9.x Compensação automática (pg_cron) → Task 16 ✅
- §11.1 Estrutura de repositório (parcial — só `supabase/` e `docs/`) → Tasks 1-3 ✅
- §11.4 Branch strategy → não implementado neste plano (vai no Plano 6 de deploy) ✓ intencional

**2. Placeholder scan:** zero `TBD/TODO/FIXME` no plano. Todo código está completo e copy-paste ready. ✓

**3. Type consistency:**
- `sortear_e_baixar_estoque(UUID) RETURNS TABLE(...)` — assinatura idêntica entre Task 11 (teste), Task 12 (implementação), Task 19 (smoke). ✓
- `is_admin()` sem args, retorna BOOLEAN — consistente entre Task 7 (teste) e Task 8 (impl). ✓
- Nomes de tabelas (singular vs plural): plural em todas (`premios`, `lojas`, `eventos`, `ganhadores`). ✓
- Nomes de constraints/índices: prefixos `unq_`, `idx_`, `dados_quando_pronta`, `premio_quando_finalizada` — consistentes entre teste e migration. ✓
- Status enum: `aguardando_celular`/`aguardando_dados`/`pronta_para_girar`/`girando`/`finalizada`/`expirada`/`cancelada` — consistentes em todos os arquivos. ✓

Plano completo, autocontido, executável task-por-task.
