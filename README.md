# Altis Bet

Plataforma de jogos com premiação para eventos Altis Sistemas — Roleta de Prêmios (MVP).

**Spec:** [`docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md`](docs/superpowers/specs/2026-05-11-altis-bet-roleta-mvp-design.md)

**Status atual:** MVP completo — versão `v1.0.0` (Planos 1-8 ✅, ~194 testes verdes). Devcontainer disponível (Plano 9).

---

## Como executar — duas opções

Você pode escolher livremente entre rodar **direto no host** (mais leve) ou usar o **Devcontainer** (mais isolado/portátil). Os dois caminhos co-existem.

### Opção A — Host direto (Windows/macOS/Linux)

Pré-requisitos no host:
- Node.js 20+ ([`.nvmrc`](.nvmrc) sugere 20)
- Docker Desktop rodando (Supabase CLI o usa internamente)
- Supabase CLI ≥ 2.0
  - Windows: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
  - macOS: `brew install supabase/tap/supabase`

Setup uma vez:
```bash
npm install --legacy-peer-deps
npx playwright install chromium     # apenas se for rodar E2E
```

Dia-a-dia:
```bash
supabase start          # sobe stack em ~10s
npm run functions:serve # T1
npm run dev             # T2 → http://localhost:3000
# para parar:
supabase stop
```

### Opção B — Devcontainer (VS Code)

Útil quando quer reproduzir o ambiente em outra máquina sem instalar nada além de Docker e VS Code (mesma config no Windows/macOS/Linux).

Pré-requisitos no host:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) rodando
- [VS Code](https://code.visualstudio.com/) + extensão [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

Primeira execução:
1. Abrir o repo no VS Code
2. `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**
3. Aguardar ~2-3 min (build + `npm ci` + `playwright install`)
4. `postStart` sobe Supabase automaticamente — observar terminal
5. `npm run dev` → `http://localhost:3000` no browser do host

Reinicializações:
- `postStart` faz `supabase start` (~5s)
- Containers Supabase vivem no **Docker Desktop do host** (não no devcontainer) — isso significa imagem leve (~2GB) e persistência natural
- `npm run db:reset` zera o banco

> **Atenção — coexistência:** o devcontainer usa o **mesmo Docker Desktop** que a Opção A. Se você tiver `supabase start` rodando no Windows host, o devcontainer reaproveita. Não rode os dois separados ao mesmo tempo para o mesmo projeto (conflito de porta 54321).

---

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
| `npm run test:cli` | Roda 18 testes Vitest da CLI (inclui totem-smoke SQL E2E) |
| `npm run test:ui` | Roda 54 testes Vitest de componentes React (UI + Totem + Jogador + Admin) |
| `npm run test:e2e` | Roda ~10 testes Playwright dual-context (precisa stack local rodando) |
| `npm run test` | tudo (db + functions + cli + ui — 184 testes; E2E é separado) |
| `npm run cli -- <comando>` | Roda a CLI em dev (via tsx) |
| `npm run dev` | Next.js dev server em http://localhost:3000 |
| `npm run build` | Build estático em `out/` |
| `npm run typecheck` | TypeScript check |

## CLI

```bash
# Setup interativo (1ª vez)
npm run cli -- bootstrap

# Não-interativo (CI):
npm run cli -- bootstrap --non-interactive \
  --supabase-url https://xxx.supabase.co \
  --supabase-service-role-key eyJ... \
  --senha-admin MinhaSenhaForte123

# Aplicar migrations pendentes
npm run cli -- migrate up

# Listar migrations aplicadas
npm run cli -- migrate status

# Trocar senha admin (prompt interativo)
npm run cli -- definir-senha-admin

# Importar prêmios de CSV para o evento ativo
npm run cli -- import-premios premios.csv

# Backup JSON (telefones mascarados)
npm run cli -- backup --saida ./backups
```

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

## Vulnerabilities npm aceitas

Após `npm audit`, restam **6 moderate** que **não afetam produção** (todas em devDependencies de teste/build):

| Pacote | Por quê aceita |
|---|---|
| `vitest`, `@vitest/ui`, `vite`, `vite-node`, `esbuild` | Fix exige `vitest 1→4` (major breaking), quebraria os 116 testes Vitest. Risco real é apenas o dev-server local aceitar requests cross-origin — não navegar para URLs externas durante `vitest`/`vite dev`. |
| `next` (transitivo `postcss <8.5.10`) | Fix oferecido pelo audit é absurdo (downgrade para next 9.3.3). Será resolvido em patch futuro do next 15.x. Risco é XSS via stringify de CSS — não processamos CSS de terceiros, exposição zero. |

A vulnerability **critical** (`happy-dom`) foi corrigida no bump para v20.

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
| 3 — CLI | ✅ completo | 6 comandos (bootstrap, migrate, senha admin, import, backup) + 17 tests |
| 4 — UI Foundation | ✅ completo | Next.js 15 + Tailwind + shadcn/ui + Auth + Login + Welcome + Modal Admin (14 tests) |
| 5 — UI Totem | ✅ completo | R3F Roleta 3D + state machine + Realtime + GSAP + QR Code (16 tests) |
| 6 — UI Jogador | ✅ completo | `/jogar` com form + fingerprint + Realtime resultado (11 tests) |
| 7 — Painel Admin | ✅ completo | Dashboard + 7 abas (Eventos, Prêmios drag-and-drop + upload, Operadores, Ganhadores, Auditoria, Config) (13 tests) |
| 8 — E2E + Deploy | ✅ completo | Playwright dual-context + axe-core + GH Pages CI/CD + Sentry opt-in (~10 E2E) |

**MVP completo — versão `v1.0.0`**

Documentação de produção:
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — setup completo de deploy
- [`docs/OPERACAO.md`](docs/OPERACAO.md) — UptimeRobot, Sentry, backups, runbook
