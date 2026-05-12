#!/usr/bin/env bash
set -euo pipefail

echo "═══════════════════════════════════════════════════════════════"
echo "  Altis Bet — post-create (1a inicializacao do devcontainer)"
echo "═══════════════════════════════════════════════════════════════"

cd /workspaces/AltisBet

echo ""
echo "▶ Versoes instaladas:"
node --version
npm --version
supabase --version
docker --version
docker compose version

echo ""
echo "▶ Instalando dependencias npm..."
npm ci --legacy-peer-deps

echo ""
echo "▶ Instalando Chromium do Playwright..."
npx playwright install chromium

if [ ! -f .env.local ]; then
  echo ""
  echo "▶ Criando .env.local com placeholder (sera sobrescrito por post-start)..."
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
