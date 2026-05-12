FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# Pacotes essenciais para o fluxo de desenvolvimento.
# - curl: download do Supabase CLI
# - jq: leitura de JSON em scripts
# - postgresql-client: psql para debug do banco
# Outras libs (chromium etc) sao instaladas pelo playwright --with-deps no postCreate.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      jq \
      postgresql-client \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Supabase CLI a partir do release oficial (binario estatico Linux x64).
# Pinned para reprodutibilidade. Atualize quando quiser bumpar.
ARG SUPABASE_VERSION=2.98.2
RUN curl -fsSL "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz" \
    | tar -xz -C /usr/local/bin supabase \
 && chmod +x /usr/local/bin/supabase \
 && supabase --version

USER node
WORKDIR /workspaces/AltisBet
