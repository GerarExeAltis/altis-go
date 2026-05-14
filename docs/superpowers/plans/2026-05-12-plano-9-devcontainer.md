# Altis Bet — Plano 9: Devcontainer + Supabase via Docker-in-Docker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a dor de instalar/configurar Supabase CLI + Docker + Node no Windows host fornecendo um **VS Code Dev Container** auto-suficiente: ao clicar "Reopen in Container", todo o stack (Node 20, Supabase CLI, Docker-in-Docker, Playwright Chromium) já vem pronto, e `supabase start` roda automaticamente no `postStart`. O desenvolvedor abre o VS Code, espera ~3 minutos na primeira vez e tudo funciona — sem `scoop`, `brew`, ou conflitos de PATH.

**Architecture:** Devcontainer baseado em `mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm` com a feature oficial `docker-in-docker` (DinD) ativa. Supabase CLI é instalado via download direto do release oficial Linux x64 (não usa scoop/brew). Os volumes Postgres do Supabase são preservados entre rebuilds via volume nomeado `altisbet-docker-data` montado em `/var/lib/docker`. Port forwarding automático leva 3000/54321-54324 ao Edge/Chrome do Windows. Playwright Chromium é instalado com deps do sistema no `postCreate`. Workflows CI no GitHub Actions **não mudam** — continuam usando `supabase/setup-cli@v1` direto no runner Ubuntu (devcontainer é só dev experience).

**Tech Stack:** Dev Containers Spec v0.2, base image Microsoft typescript-node:1-20-bookworm (Debian 12), feature `docker-in-docker:2`, feature `github-cli:1`, Supabase CLI v2.x, Playwright 1.60 com Chromium + ffmpeg.

**Pré-requisitos no host Windows do desenvolvedor:**
- Docker Desktop rodando (WSL2 backend)
- VS Code com extensão `ms-vscode-remote.remote-containers`
- (Opcional) WSL Ubuntu para melhor performance de bind mount

**Tempo estimado:** ~4-6 horas (criar arquivos é rápido; debugar DinD + Supabase + volume persistence demora).

---

## File structure que este plano cria

```
altis-bet/
├─ .devcontainer/
│  ├─ devcontainer.json          # NEW: config principal Dev Containers
│  ├─ Dockerfile                 # NEW: extends node:20 + supabase CLI
│  ├─ post-create.sh             # NEW: setup uma vez (npm ci, playwright)
│  └─ post-start.sh              # NEW: toda inicialização (supabase start)
├─ README.md                     # MODIFY: nova seção "Devcontainer (recomendado)"
├─ .gitattributes                # NEW: forçar LF nos .sh do devcontainer
└─ docs/superpowers/plans/
   └─ 2026-05-12-plano-9-devcontainer.md   # este arquivo
```

---

## Convenções

- Scripts `.sh` **sempre LF** (Windows CRLF quebra shebang) — `.gitattributes` enforce.
- Variáveis sensíveis (`SUPABASE_ACCESS_TOKEN`, etc) NÃO vão no `devcontainer.json` — usar `.env` local que devcontainer monta.
- Não duplicar configuração já existente no repo (tsconfig, vitest, etc) — devcontainer só configura o **ambiente**, não o build.
- Workflows GitHub Actions ficam inalterados.

---

## Task 1 — Estrutura .devcontainer + .gitattributes

**Files:**
- Create: `.devcontainer/devcontainer.json`
- Create: `.devcontainer/Dockerfile`
- Create: `.gitattributes`

- [ ] **Step 1.1: Criar `.gitattributes`**

```gitattributes
# Garante LF em scripts shell (Windows CRLF quebra shebang em Linux)
*.sh text eol=lf
.devcontainer/* text eol=lf

# Binários
*.png binary
*.jpg binary
*.ico binary
*.pdf binary
```

- [ ] **Step 1.2: Criar `.devcontainer/Dockerfile`**

```dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# ─── Pacotes básicos do sistema ───────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      wget \
      unzip \
      jq \
      postgresql-client \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── Supabase CLI ─────────────────────────────────────────────────────
# Instala a partir do release oficial (binário estático Linux x64).
# Pinned para evitar surpresas. Atualize quando quiser bumpar.
ARG SUPABASE_VERSION=2.98.2
RUN curl -fsSL "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz" \
    | tar -xz -C /usr/local/bin supabase \
 && chmod +x /usr/local/bin/supabase \
 && supabase --version

# ─── Pre-cache deps do Playwright (browsers vêm depois no postCreate) ──
# Playwright precisa de várias libs do sistema para o Chromium headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
      libdrm2 libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
      libcairo2 libasound2 libxshmfence1 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Node user já existe na imagem base — apenas confirma
USER node
WORKDIR /workspaces/AltisBet
```

- [ ] **Step 1.3: Criar `.devcontainer/devcontainer.json`**

```jsonc
{
  "name": "Altis Bet — Dev Container",
  "build": {
    "dockerfile": "Dockerfile",
    "context": "."
  },

  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest",
      "moby": true,
      "dockerDashComposeVersion": "v2"
    },
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  // Volume persistente para preservar os containers/volumes do Supabase
  // entre rebuilds do devcontainer (Postgres data, storage objects, etc).
  "mounts": [
    "source=altisbet-docker-data,target=/var/lib/docker,type=volume"
  ],

  // VS Code abre portas automaticamente quando processos começam a escutar.
  "forwardPorts": [3000, 54321, 54322, 54323, 54324],
  "portsAttributes": {
    "3000":  { "label": "Next.js dev",   "onAutoForward": "openPreview" },
    "54321": { "label": "Supabase API",  "onAutoForward": "notify" },
    "54322": { "label": "Postgres",      "onAutoForward": "silent" },
    "54323": { "label": "Supabase Studio","onAutoForward": "notify" },
    "54324": { "label": "Mailpit",       "onAutoForward": "silent" }
  },

  "postCreateCommand": "bash .devcontainer/post-create.sh",
  "postStartCommand":  "bash .devcontainer/post-start.sh",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "ms-playwright.playwright",
        "denoland.vscode-deno",
        "supabase.vscode-supabase-extension",
        "ms-azuretools.vscode-docker",
        "github.vscode-github-actions",
        "yoavbls.pretty-ts-errors"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "zsh",
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "deno.enablePaths": ["supabase/functions"],
        "deno.unstable": true
      }
    }
  },

  "remoteUser": "node",
  "workspaceFolder": "/workspaces/AltisBet"
}
```

- [ ] **Step 1.4: Commit inicial estrutura**

```bash
git add .gitattributes .devcontainer/Dockerfile .devcontainer/devcontainer.json
git commit -m "feat(devcontainer): scaffold devcontainer.json + Dockerfile com Supabase CLI"
```

---

## Task 2 — Scripts post-create e post-start

**Files:**
- Create: `.devcontainer/post-create.sh`
- Create: `.devcontainer/post-start.sh`

- [ ] **Step 2.1: Criar `.devcontainer/post-create.sh`**

Executa **uma única vez** após a primeira construção do container:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "═══════════════════════════════════════════════════════════════"
echo "  Altis Bet — post-create (1ª inicialização do devcontainer)"
echo "═══════════════════════════════════════════════════════════════"

cd /workspaces/AltisBet

# ─── 1) Confirma binários ───────────────────────────────────────────
echo ""
echo "▶ Versões instaladas:"
node --version
npm --version
supabase --version
docker --version
docker compose version

# ─── 2) npm ci ───────────────────────────────────────────────────────
echo ""
echo "▶ Instalando dependências npm..."
npm ci --legacy-peer-deps

# ─── 3) Playwright browsers ──────────────────────────────────────────
# As deps do sistema (libnss3 etc) já foram instaladas no Dockerfile.
# Aqui só baixa o Chromium para o cache do user.
echo ""
echo "▶ Instalando Chromium do Playwright..."
npx playwright install chromium

# ─── 4) Cria arquivos de .env.local placeholder se não existirem ────
if [ ! -f .env.local ]; then
  echo ""
  echo "▶ Criando .env.local com placeholder (será sobrescrito por post-start)..."
  cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=will-be-set-by-post-start.sh
EOF
fi

if [ ! -f supabase/.env.local ]; then
  echo ""
  echo "▶ Criando supabase/.env.local com placeholder..."
  cat > supabase/.env.local <<'EOF'
JWT_AUTH_SECRET=will-be-set-by-post-start.sh
SESSAO_JWT_SECRET=test-sessao-secret-with-at-least-32-characters-aaa
EOF
fi

echo ""
echo "✓ post-create OK. Aguarde o postStart subir o Supabase..."
```

- [ ] **Step 2.2: Criar `.devcontainer/post-start.sh`**

Executa **toda vez** que o container inicia (incluindo após restart):

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/AltisBet

echo "═══════════════════════════════════════════════════════════════"
echo "  Altis Bet — post-start"
echo "═══════════════════════════════════════════════════════════════"

# ─── 1) Espera o daemon do DinD estar pronto ────────────────────────
echo ""
echo "▶ Aguardando Docker daemon (DinD)..."
for i in {1..30}; do
  if docker info >/dev/null 2>&1; then
    echo "✓ Docker pronto."
    break
  fi
  sleep 1
done

if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker daemon não respondeu. Abortando supabase start."
  exit 1
fi

# ─── 2) Sobe Supabase (idempotente — não erra se já estiver up) ─────
echo ""
echo "▶ Subindo Supabase local..."
supabase start || {
  echo "⚠ Supabase já estava rodando ou houve erro — tentando status..."
  supabase status || true
}

# ─── 3) Aguarda Studio (54323) responder ─────────────────────────────
echo ""
echo "▶ Aguardando Studio (porta 54323)..."
for i in {1..30}; do
  if curl -sf http://127.0.0.1:54323 >/dev/null 2>&1; then
    echo "✓ Studio pronto."
    break
  fi
  sleep 1
done

# ─── 4) Atualiza .env.local com chaves reais do stack ────────────────
echo ""
echo "▶ Atualizando .env.local com chaves do stack..."
STATUS=$(supabase status -o env)
ANON_KEY=$(echo "$STATUS" | grep '^ANON_KEY=' | cut -d'"' -f2)
JWT_SECRET=$(echo "$STATUS" | grep '^JWT_SECRET=' | cut -d'"' -f2)

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
EOF

cat > supabase/.env.local <<EOF
JWT_AUTH_SECRET=${JWT_SECRET}
SESSAO_JWT_SECRET=test-sessao-secret-with-at-least-32-characters-aaa
EOF

# ─── 5) Exibe URLs prontas ───────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Stack pronto!"
echo "═══════════════════════════════════════════════════════════════"
echo "  Supabase Studio:  http://localhost:54323"
echo "  Supabase API:     http://localhost:54321"
echo "  Mailpit:          http://localhost:54324"
echo ""
echo "  Próximo passo: npm run dev  →  http://localhost:3000"
echo "═══════════════════════════════════════════════════════════════"
```

- [ ] **Step 2.3: Tornar scripts executáveis (via git)**

Como Windows não preserva o bit `+x`, configuramos via git:

```bash
git add .devcontainer/post-create.sh .devcontainer/post-start.sh
git update-index --chmod=+x .devcontainer/post-create.sh
git update-index --chmod=+x .devcontainer/post-start.sh
```

- [ ] **Step 2.4: Commit**

```bash
git commit -m "feat(devcontainer): scripts post-create e post-start com Supabase auto-up"
```

---

## Task 3 — Documentação no README

**Files:**
- Modify: `README.md`

- [ ] **Step 3.1: Adicionar seção "Devcontainer (recomendado)" antes de "Pré-requisitos"**

Localizar a linha `## Pré-requisitos` e inserir **antes** dela:

```markdown
## Devcontainer (recomendado)

A forma mais fácil de rodar o projeto no Windows (ou qualquer OS) é via **VS Code Dev Container**:

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) rodando (WSL2 backend no Windows)
- [VS Code](https://code.visualstudio.com/) com a extensão [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Primeira execução
1. Clonar o repo no Windows
2. Abrir a pasta no VS Code
3. Quando aparecer o aviso "Folder contains a Dev Container", clicar em **"Reopen in Container"**.
   - Alternativa: `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
4. Aguardar ~3-5 min (1ª vez baixa imagem Node + Docker-in-Docker + Supabase CLI)
5. O `postStart` sobe o Supabase automaticamente em background — observe o terminal
6. Quando o Studio abrir em `http://localhost:54323`, rode `npm run dev` e abra `http://localhost:3000`

### Reinicializações posteriores
- VS Code abre o container → `postStart` faz `supabase start` (5-10s — containers já existem)
- Dados do Postgres persistem entre reinícios via volume `altisbet-docker-data`
- `npm run db:reset` quando quiser zerar e re-aplicar migrations+seed

### Comandos úteis dentro do devcontainer
Iguais aos do host — vide a tabela "Comandos úteis" abaixo. Tudo funciona em um terminal `zsh` do VS Code.

### Quando NÃO usar o devcontainer
- Se você já tem Node 20 + Supabase CLI + Docker funcionando perfeitamente no host
- Em produção/CI (workflows usam runner Ubuntu direto, vide `.github/workflows/`)

```

- [ ] **Step 3.2: Ajustar a seção "Pré-requisitos" existente para deixar claro que é o caminho alternativo**

Trocar:
```markdown
## Pré-requisitos
```
por:
```markdown
## Pré-requisitos (instalação manual no host)

> Pule esta seção se for usar o **Devcontainer** acima.
```

- [ ] **Step 3.3: Commit**

```bash
git add README.md
git commit -m "docs: adiciona seção Devcontainer (recomendado) no README"
```

---

## Task 4 — Validação local

> Esta task é **manual** — o agente que executa este plano não consegue testar o devcontainer dentro de outro container/sessão. Use a checklist para validar antes do merge.

- [ ] **Step 4.1: Reabrir no Container (1ª vez)**

1. VS Code → `Ctrl+Shift+P` → "Dev Containers: Rebuild and Reopen in Container"
2. Observar log de build: deve baixar imagem Node, instalar Supabase CLI, rodar `npm ci`, baixar Chromium do Playwright. Tempo esperado: 3-8 minutos.
3. **Esperado**: terminal `zsh` aberto em `/workspaces/AltisBet`.

- [ ] **Step 4.2: Verificar binários e Supabase up**

No terminal do devcontainer:
```bash
node --version          # v20.x
npm --version           # 10.x
supabase --version      # 2.98.2 ou superior
docker --version        # 27.x
supabase status         # deve listar URLs ativas
```

**Esperado**: `supabase status` retorna Studio em `http://127.0.0.1:54323`, API em `http://127.0.0.1:54321`.

- [ ] **Step 4.3: Smoke test do banco**

```bash
npm run test:db
```

**Esperado**: 83 testes pgTAP passam.

- [ ] **Step 4.4: Smoke test UI**

```bash
npm run test:ui
```

**Esperado**: 54 testes Vitest passam.

- [ ] **Step 4.5: Smoke test E2E (apenas 1 spec rápido)**

Em 2 terminais (split no VS Code):
```bash
# Terminal 1
npm run functions:serve

# Terminal 2
npm run dev
```

Em um 3º terminal:
```bash
npm run test:e2e -- login
```

**Esperado**: 4 testes de login.spec.ts passam.

- [ ] **Step 4.6: Validar port-forward para o Windows**

No browser do **Windows host** (Edge/Chrome):
- `http://localhost:3000` → página de login renderiza
- `http://localhost:54323` → Supabase Studio abre

- [ ] **Step 4.7: Validar persistência**

1. Criar manualmente um evento ou prêmio extra via Studio
2. VS Code → `Ctrl+Shift+P` → "Dev Containers: Rebuild Container" (não "rebuild without cache")
3. Após rebuild, abrir Studio novamente
4. **Esperado**: o evento/prêmio criado continua lá (volume `altisbet-docker-data` preservou)

- [ ] **Step 4.8: Tag**

Se todos os smoke tests passaram:
```bash
git tag -a plano-9-completo -m "Plano 9: Devcontainer + Supabase em DinD"
```

---

## Resumo pós-Plano 9

✅ `.devcontainer/` completo com Dockerfile, devcontainer.json, post-create.sh, post-start.sh
✅ Supabase CLI 2.98+ instalado dentro do container (sem dependência de scoop/brew no host)
✅ Docker-in-Docker via feature oficial
✅ Volume nomeado `altisbet-docker-data` preserva dados Postgres entre rebuilds
✅ `postStart` sobe Supabase automaticamente e atualiza `.env.local` com chaves reais
✅ Port forwarding 3000/54321-54324 expõe tudo no `localhost` do Windows
✅ README com seção "Devcontainer (recomendado)" antes da instalação manual
✅ `.gitattributes` força LF nos `.sh`
✅ Workflows GitHub Actions **inalterados** (devcontainer é dev experience)

**Após este plano, o agente Claude Code do VS Code rodando dentro do devcontainer encontra `supabase` no PATH normalmente — fim das frustrações.**

---

## Self-Review

**1. Spec coverage:**
- "Tudo dentro do devcontainer" → `Dockerfile` instala Node, Supabase CLI, Playwright deps; feature DinD ✅
- "Port-forward localhost Windows" → `forwardPorts: [3000, 54321-54324]` ✅
- "Volume persistente" → `mounts: altisbet-docker-data → /var/lib/docker` ✅
- "Auto-start" → `postStartCommand: post-start.sh → supabase start` ✅

**2. Placeholder scan:** zero TBD/TODO. Cada step com código completo. ✅

**3. Type consistency:**
- Nome do volume `altisbet-docker-data` consistente entre devcontainer.json e checklist da Task 4.7 ✅
- Versão do Supabase CLI pinned (`SUPABASE_VERSION=2.98.2`) em `Dockerfile` — compatível com a versão usada no host atual ✅
- `remoteUser: node` na imagem `typescript-node` que tem o user `node` por padrão ✅
- Scripts `.sh` usam `set -euo pipefail` — falha rápido em erro ✅

**4. Riscos identificados:**
- **DinD performance no Windows**: pode ser 30-50% mais lento que Supabase direto no host. Aceitável para dev — em CI usamos runner direto.
- **Primeira build longa (~5min)**: documentado no README; espera é por download de imagens, não build de código.
- **Conflito de porta** se o Supabase do host já estiver rodando em 54321: orientar usuário a `supabase stop` no host antes de abrir devcontainer.
- **Bit `+x` não preservado no Windows**: tratado em Step 2.3 via `git update-index --chmod=+x`.

Plano completo, autocontido, executável task-por-task.
