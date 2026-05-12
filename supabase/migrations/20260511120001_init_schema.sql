-- 20260511120001_init_schema.sql
-- Schema base do Altis Bet — todas tabelas, types, indices, constraints.
-- RLS e habilitada na migration seguinte (20260511120004).

-- ━━━━━━━━━━━━━━━━━━━━━━━━ EXTENSOES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ━━━━━━━━━━━━━━━━━━━━━━━━ ENUMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TYPE public.sessao_status AS ENUM (
  'aguardando_celular',
  'aguardando_dados',
  'pronta_para_girar',
  'girando',
  'finalizada',
  'expirada',
  'cancelada'
);

CREATE TYPE public.jogo_tipo AS ENUM ('roleta', 'dados');

-- ━━━━━━━━━━━━━━━━━━━━━━━━ IDENTIDADE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.perfis_operadores (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  convidado_por UUID REFERENCES auth.users(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.admin_credenciais (
  id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  senha_hash      TEXT NOT NULL,
  atualizada_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_por  UUID REFERENCES auth.users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ CATALOGO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.lojas (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome   TEXT NOT NULL UNIQUE,
  cidade TEXT,
  ativa  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.eventos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'rascunho'
              CHECK (status IN ('rascunho','ativo','pausado','encerrado')),
  criado_por  UUID NOT NULL REFERENCES auth.users(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (data_fim >= data_inicio)
);

CREATE UNIQUE INDEX unq_evento_ativo
  ON public.eventos(status) WHERE status = 'ativo';

CREATE TABLE public.premios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id       UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  foto_path       TEXT,
  cor_hex         TEXT CHECK (cor_hex ~ '^#[0-9A-Fa-f]{6}$'),
  peso_base       INT NOT NULL DEFAULT 1 CHECK (peso_base >= 0),
  estoque_inicial INT NOT NULL CHECK (estoque_inicial >= 0),
  estoque_atual   INT NOT NULL CHECK (estoque_atual >= 0),
  ordem_roleta    INT NOT NULL DEFAULT 0,
  e_premio_real   BOOLEAN NOT NULL DEFAULT true,
  CHECK (estoque_atual <= estoque_inicial)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ SESSOES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.sessoes_jogo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id           UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  jogo                public.jogo_tipo NOT NULL,
  status              public.sessao_status NOT NULL DEFAULT 'aguardando_celular',
  criada_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  liberada_por        UUID NOT NULL REFERENCES auth.users(id),

  jogador_nome        TEXT,
  jogador_telefone    TEXT,
  jogador_email       TEXT,
  jogador_loja_id     UUID REFERENCES public.lojas(id),
  jogador_fingerprint TEXT,
  jogador_ip          INET,
  jogador_user_agent  TEXT,

  premio_sorteado_id  UUID REFERENCES public.premios(id),
  girada_em           TIMESTAMPTZ,
  finalizada_em       TIMESTAMPTZ,

  CONSTRAINT dados_quando_pronta CHECK (
    status NOT IN ('pronta_para_girar','girando','finalizada')
    OR (jogador_nome IS NOT NULL
        AND jogador_telefone IS NOT NULL
        AND jogador_email IS NOT NULL)
  ),
  CONSTRAINT premio_quando_finalizada CHECK (
    status <> 'finalizada' OR premio_sorteado_id IS NOT NULL
  )
);

CREATE INDEX idx_sess_evento_status ON public.sessoes_jogo(evento_id, status);

CREATE INDEX idx_sess_expira
  ON public.sessoes_jogo(expira_em)
  WHERE status IN ('aguardando_celular', 'aguardando_dados');

CREATE UNIQUE INDEX unq_jogada_tel_evento_jogo
  ON public.sessoes_jogo(evento_id, jogo, jogador_telefone)
  WHERE status IN ('pronta_para_girar', 'girando', 'finalizada');

-- ━━━━━━━━━━━━━━━━━━━━━━━━ GANHADORES + BLACKLIST ━━━━━━━━━━━━━━━━

CREATE TABLE public.ganhadores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id         UUID NOT NULL UNIQUE REFERENCES public.sessoes_jogo(id) ON DELETE CASCADE,
  evento_id         UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  premio_id         UUID NOT NULL REFERENCES public.premios(id),
  jogador_nome      TEXT NOT NULL,
  jogador_telefone  TEXT NOT NULL,
  jogador_email     TEXT NOT NULL,
  jogador_loja_id   UUID REFERENCES public.lojas(id),
  ganho_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue          BOOLEAN NOT NULL DEFAULT false,
  entregue_em       TIMESTAMPTZ,
  entregue_por      UUID REFERENCES auth.users(id),
  observacoes       TEXT
);

CREATE INDEX idx_ganh_evento   ON public.ganhadores(evento_id);
CREATE INDEX idx_ganh_telefone ON public.ganhadores(jogador_telefone);

CREATE TABLE public.fingerprints_bloqueados (
  fingerprint    TEXT PRIMARY KEY,
  motivo         TEXT NOT NULL,
  bloqueado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_por  UUID REFERENCES auth.users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ AUDITORIA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE public.auditoria (
  id            BIGSERIAL PRIMARY KEY,
  evento_id     UUID REFERENCES public.eventos(id),
  acao          TEXT NOT NULL,
  ator          UUID REFERENCES auth.users(id),
  recurso_tipo  TEXT,
  recurso_id    UUID,
  detalhes      JSONB,
  ip            INET,
  user_agent    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_evento ON public.auditoria(evento_id);
CREATE INDEX idx_audit_data   ON public.auditoria(criado_em DESC);
CREATE INDEX idx_audit_acao   ON public.auditoria(acao);
