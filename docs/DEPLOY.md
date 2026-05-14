# AltisGo — Guia de Deploy em Produção

## 1. Criar projeto Supabase

1. Acessar [app.supabase.com](https://app.supabase.com) → **New project**.
2. Anotar `Project URL`, `anon key`, `service_role key`, `Project ref` (Settings → API).
3. Definir senha do banco (Settings → Database) — usada apenas em CI.

## 2. Configurar secrets no GitHub

No repo, **Settings → Secrets and variables → Actions** → adicionar:

| Secret | Valor |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token pessoal do dashboard Supabase (Account → Access tokens) |
| `SUPABASE_PROJECT_REF` | `Project ref` (string tipo `abcdefghijklmn`) |
| `SUPABASE_DB_PASSWORD` | Senha do banco |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública |
| `NEXT_PUBLIC_SENTRY_DSN` (opcional) | DSN do projeto Sentry |

## 3. Configurar segredos das Edge Functions

As Edge Functions usam dois segredos em runtime:

| Secret | Origem | Função |
|---|---|---|
| `JWT_AUTH_SECRET` | **Legacy JWT Secret** do Supabase | Assinar o JWT-Admin elevado (30 min após senha admin) que passa pelo `auth.jwt()` do Postgres |
| `SESSAO_JWT_SECRET` | Gerado por você (random 48 bytes) | Assinar o token da sessão que vai no QR code do totem (`?t=...`) |

### 3.1 — Obter o `JWT_AUTH_SECRET` (Legacy JWT Secret)

Desde 2025 o Supabase migrou de "JWT Secret" único (HS256) para "Signing Keys" assimétricas (ES256). O **JWT do operador logado** já é validado via JWKS automaticamente pelo código deste projeto — não precisa setar nada para isso funcionar.

O que ainda precisamos do legacy secret: assinar o **JWT-Admin elevado** internamente. Mesmo após a migração, o Supabase preserva o legacy secret para verificação.

1. Dashboard → **Settings → API** (ou **Settings → JWT Keys**)
2. Procure a seção **"Legacy JWT Settings"** / **"JWT Secret (legacy)"**
3. Clique em `Reveal` no campo do secret e copie o valor

> Se o legacy secret um dia for revogado pelo Supabase, será preciso migrar `signAdminToken` em `supabase/functions/_shared/jwt.ts` para usar Signing Keys (RS256/ES256). Por ora, o legacy continua suportado.

### 3.2 — Gerar o `SESSAO_JWT_SECRET`

Esse é um segredo próprio do app — qualquer string aleatória forte serve.

```bash
# Git Bash / Linux / macOS
openssl rand -base64 48
```

```powershell
# PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3.3 — Setar os 2 segredos no Supabase Cloud

Via CLI:

```bash
npx supabase secrets set JWT_AUTH_SECRET="cole-o-legacy-jwt-secret" --project-ref XXX
npx supabase secrets set SESSAO_JWT_SECRET="cole-o-aleatorio-gerado" --project-ref XXX
```

Ou via Dashboard → **Edge Functions → Manage secrets**:
- Add `JWT_AUTH_SECRET` = (valor do passo 3.1)
- Add `SESSAO_JWT_SECRET` = (valor do passo 3.2)

### 3.4 — Verificar

```bash
npx supabase secrets list --project-ref XXX
```

Deve listar `JWT_AUTH_SECRET` e `SESSAO_JWT_SECRET` (mascarados). Outros (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) são preenchidos automaticamente pelo Supabase.

## 4. Configurar GitHub Pages

1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. Branch `main` é a fonte de produção.

## 5. Primeiro deploy

```bash
git push origin main
```

GitHub Actions executa:
1. **migrate**: aplica migrations Supabase + deploy de Edge Functions.
2. **build**: gera `out/` com Next.js static export.
3. **deploy**: publica em `https://<usuario>.github.io/altis-bet/`.

## 6. Bootstrap inicial via CLI

Após o primeiro deploy, ainda precisa rodar localmente apontando para o Supabase de produção:

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npx altis-bet bootstrap --non-interactive \
  --supabase-url $SUPABASE_URL \
  --supabase-service-role-key $SUPABASE_SERVICE_ROLE_KEY \
  --senha-admin "SuaSenhaSegura123"
```

## 7. Validação pós-deploy

Acessar `https://<usuario>.github.io/altis-bet/login`:
- Logar com o operador criado
- Ativar modo admin com a senha definida
- Criar primeiro evento real
- Cadastrar prêmios (incluindo "Não foi dessa vez")
- Ativar evento
