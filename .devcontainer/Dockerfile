FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Pacotes basicos do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      wget \
      unzip \
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

# Pre-instala deps de sistema do Chromium (Playwright). Os browsers em si
# sao baixados no postCreate como user 'node'.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
      libdrm2 libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
      libcairo2 libasound2 libxshmfence1 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /workspaces/AltisBet
