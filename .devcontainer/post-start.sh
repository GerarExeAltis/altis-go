#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/AltisBet

echo "═══════════════════════════════════════════════════════════════"
echo "  Altis Bet — post-start"
echo "═══════════════════════════════════════════════════════════════"

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
  echo "✗ Docker daemon nao respondeu. Abortando supabase start."
  exit 1
fi

echo ""
echo "▶ Subindo Supabase local..."
supabase start || {
  echo "⚠ Supabase ja estava rodando ou houve erro — tentando status..."
  supabase status || true
}

echo ""
echo "▶ Aguardando Studio (porta 54323)..."
for i in {1..30}; do
  if curl -sf http://127.0.0.1:54323 >/dev/null 2>&1; then
    echo "✓ Studio pronto."
    break
  fi
  sleep 1
done

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

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Stack pronto!"
echo "═══════════════════════════════════════════════════════════════"
echo "  Supabase Studio:  http://localhost:54323"
echo "  Supabase API:     http://localhost:54321"
echo "  Mailpit:          http://localhost:54324"
echo ""
echo "  Proximo passo: npm run dev  →  http://localhost:3000"
echo "═══════════════════════════════════════════════════════════════"
