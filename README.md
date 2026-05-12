# Altis Bet

Plataforma de jogos com premiação para eventos Altis Sistemas — Roleta de Prêmios (MVP).

**Spec:** [`docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md`](docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md)

**Status atual:** Plano 1 (Foundation DB) ✅ completo. Próximo: Plano 2 (Edge Functions).

---

## Pré-requisitos

- **Node.js 20.x** — recomendado via `nvm` (com `.nvmrc`)
- **Docker Desktop** rodando
- **Supabase CLI** ≥ 2.0
  - Windows: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
  - macOS: `brew install supabase/tap/supabase`

## Quickstart local

```bash
# 1. Clonar e instalar
git clone <repo>
cd altis-bet
nvm use            # opcional, usa Node 20
npm install

# 2. Subir Supabase local (1ª vez baixa imagens Docker, ~5-15min)
npm run db:start

# 3. Resetar DB e aplicar migrations + seed
npm run db:reset

# 4. Rodar testes pgTAP
npm run test:db

# 5. Abrir Supabase Studio no browser
# http://127.0.0.1:54323
```

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run db:start` | Sobe stack Supabase local (Postgres, Auth, Realtime, Studio, Storage) |
| `npm run db:stop` | Derruba stack |
| `npm run db:reset` | Reset completo + aplica migrations + roda seed |
| `npm run db:status` | Mostra URLs e chaves do stack local |
| `npm run test:db` | Roda 83 testes pgTAP em `supabase/tests/` |
| `npm run functions:serve` | Hot-reload das Edge Functions Deno em :54321 |
| `npm run test:functions` | Roda 29 testes Vitest contra as Edge Functions (precisa `functions:serve` rodando) |
| `npm run test` | db tests + function tests sequencial (112 testes total) |
| `npm run typecheck` | TypeScript check |

## Rodando os testes de Edge Functions

Em **dois terminais separados**:

```bash
# Terminal 1 — sobe as functions com hot reload
npm run functions:serve

# Terminal 2 — roda os testes
npm run test:functions
```

Se o terminal 1 não estiver rodando, os testes falham com `connect ECONNREFUSED`. Em CI a orquestração é automática via GitHub Actions.

## Estrutura

```
altis-bet/
├─ supabase/
│  ├─ migrations/    # SQL versionado, aplicado em ordem (6 migrations)
│  ├─ seed.sql       # dados iniciais (dev)
│  └─ tests/         # pgTAP tests (83 asserts em 9 arquivos)
├─ src/              # placeholder; código real virá nos planos seguintes
├─ docs/superpowers/
│  ├─ specs/         # specs aprovados
│  └─ plans/         # planos de implementação
└─ README.md         # este arquivo
```

## Lints do Supabase aceitos

O Database Linter do Supabase reporta 17 warnings residuais do tipo `pg_graphql_*_table_exposed` (tabelas visíveis no schema GraphQL para anon e authenticated). **Aceitos conscientemente** porque:

- Não usamos GraphQL — fluxo é REST + Edge Functions (Seção 2 do spec).
- RLS bloqueia leitura efetiva — o lint é sobre o nome da tabela aparecer no schema introspectable, não acesso a dados.
- Revogar SELECT geral quebraria Supabase Realtime (subscription do celular do jogador) e as policies admin que dependem do GRANT.

Se um dia adotarmos GraphQL ativamente, revisitamos via comment directives ou movendo tabelas sensíveis para schema `private`.

## Credenciais de desenvolvimento (apenas local)

- **Operador**: `dev@altis.local` / `senha123`
- **Senha modo admin**: `admin123`

⚠ Hashes placeholder no seed. Em produção, senhas reais serão definidas pela CLI no bootstrap (Plano 3).

## Próximos planos

| Plano | Status | Conteúdo |
|---|---|---|
| 1 — Foundation DB | ✅ completo | Schema + RLS + sortear + pg_cron + Storage + seed |
| 2 — Edge Functions | ✅ completo | 7 Edge Functions Deno + shared utils + 29 Vitest tests |
| 3 — CLI | ⏳ | bootstrap, migrate, definir-senha-admin, import-premios, backup |
| 4 — UI Login + Totem | ⏳ | Next.js + Tailwind + shadcn + R3F |
| 5 — UI Jogador + Admin | ⏳ | `/jogar` + painel admin completo |
| 6 — E2E + Deploy | ⏳ | Playwright + GitHub Pages + Sentry + UptimeRobot |
