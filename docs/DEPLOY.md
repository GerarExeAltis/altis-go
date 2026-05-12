# Altis Bet — Guia de Deploy em Produção

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

Em runtime, as Edge Functions precisam dos segredos JWT:

```bash
supabase secrets set JWT_AUTH_SECRET="$(openssl rand -base64 48)" --project-ref XXX
supabase secrets set SESSAO_JWT_SECRET="$(openssl rand -base64 48)" --project-ref XXX
```

`JWT_AUTH_SECRET` deve corresponder ao "JWT Secret" do Supabase Auth (Settings → API → JWT Secret). Use o mesmo valor.

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
