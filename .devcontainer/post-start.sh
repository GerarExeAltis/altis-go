#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/AltisBet

echo "═══════════════════════════════════════════════════════════════"
echo "  Altis Bet — post-start"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "▶ Verificando Docker (socket do host)..."
if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker daemon nao acessivel."
  echo "  Verifique se Docker Desktop esta rodando no Windows host."
  exit 1
fi
echo "✓ Docker pronto (usando socket do host Windows)."

# Aviso: como usamos docker-outside-of-docker, os containers Supabase rodam
# direto no Docker Desktop do host. Se voce ja tinha 'supabase start' rodando
# fora do devcontainer, vai detectar e reutilizar.
echo ""
echo "▶ Subindo Supabase local (containers vivem no Docker Desktop do host)..."
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
