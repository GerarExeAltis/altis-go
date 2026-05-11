# Altis Bet — Roleta MVP + Fundação Compartilhada

**Spec:** 1 (Roleta MVP)
**Gerado em:** 2026-05-11
**Status:** Em revisão
**Repositório:** `C:\GitHub\ProjetoAlits\AltisBet`
**Stack:** Next.js 15 (static export) + Supabase + Three.js (R3F)
**Hospedagem:** GitHub Pages

---

## 1. Visão geral

**Altis Bet** é uma plataforma de gamificação para eventos e ativações de marketing da Altis Sistemas. Este spec cobre o **primeiro entregável**: o jogo **Roleta de Prêmios** mais a **fundação compartilhada** (auth, multi-evento, painel admin mínimo, segurança, deploy) que será reaproveitada pelos jogos subsequentes.

### 1.1 Sub-projetos futuros (fora deste spec)

| Spec | Conteúdo |
|---|---|
| Spec 2 | Jogo de Dados (3D dice + lógica) |
| Spec 3 | CLI completa (`reset`, `gerar-jogadas-fake`, `exportar-excel`, `restore`) |
| Spec 4 | Aba "Entrega" com checklist avançado de itens enviados |
| Spec 5 | Métricas avançadas, exportações Excel, dashboard executivo |

### 1.2 Cenário físico

O jogo acontece com **dois dispositivos**:
- **TOTEM** — TV/monitor grande com touchscreen na loja/evento, rodando o app em fullscreen.
- **CELULAR DO CLIENTE** — escaneia QR Code no totem, preenche formulário, vê o resultado.

A roleta 3D gira **no totem** (espetáculo), o formulário roda **no celular** (privacidade dos dados).

### 1.3 Decisões confirmadas no brainstorming

| # | Decisão |
|---|---|
| 1 | Escopo: Roleta MVP + fundação compartilhada |
| 2 | Stack: Next.js (`output: 'export'`) em GitHub Pages + Supabase (RLS + Edge Functions + Postgres + Realtime) + Three.js via React Three Fiber |
| 3 | Cenário: Totem + celular do jogador (dois dispositivos) |
| 4 | Multi-evento — cada evento tem catálogo/estoque próprio; só **1 evento ativo** por vez |
| 5 | Trigger do ciclo: **touchscreen do totem** (cliente toca "TOQUE PARA PARTICIPAR"). Operador opcional — totem opera sozinho |
| 6 | Dados do jogador: Nome + Telefone/WhatsApp + E-mail + Loja (opcional) |
| 7 | Limite: 1 jogada / celular / evento / jogo (Roleta e Dados contam separado) |
| 8 | Sorteio: probabilidade ponderada por estoque restante (`peso_base × estoque_atual` para prêmios reais; `peso_base` puro para "Não foi dessa vez") |
| 9 | Slot "Não foi dessa vez" existe — nem todo jogador ganha prêmio físico |
| 10 | Validação do telefone: **leve** (DDD válido + formato 11 dígitos começando com 9 + blacklist de fingerprint+telefone). Sem OTP/SMS |
| 11 | Admin: **único super-admin** (modal de senha sobreposto ao login geral) |
| 12 | Login geral: **operadores cadastrados via convite por e-mail** (Supabase Auth invite) |
| 13 | Coordenação totem ↔ celular: **Supabase Realtime puro** (WebSocket via Postgres CDC) |
| 14 | Identidade visual: logo Altis (`logo.svg`) + animação (`altis-animacao.gif`) + paleta `#4afad4` (claro) / `#009993` (escuro) — auto-toggle por `prefers-color-scheme` |
| 15 | Acessibilidade: **WCAG AA** (contraste 4.5:1, navegação por teclado, ARIA) |
| 16 | Idioma: **PT-BR** apenas |
| 17 | Tela pós-login: "Altis Bet" + logo, ícone admin no topo direito, botões Roleta + Dados ("em breve") no centro |

### 1.4 Princípios de desenvolvimento

1. **Nunca confiar no frontend** — frontend é zona hostil; toda lógica que mexe em prêmio/estoque/sessão roda em Edge Function ou função PL/pgSQL `SECURITY DEFINER`.
2. **Defesa em profundidade** — autenticação + autorização (RLS) + validação semântica (CHECKs/constraints) + auditoria. Quebrar uma camada não basta.
3. **Privilégio mínimo** — operador padrão não edita prêmios; admin sim, mas só após desbloqueio temporário (JWT 30min).
4. **Audit by default** — toda ação sensível grava em `auditoria`.
5. **TDD para o núcleo confiável** (sorteio, tokens, state transitions, Edge Functions de estado); testes pós-código para UI puramente visual.
6. **Idempotência** — Edge Functions que mudam estado são idempotentes; double-click não duplica.

---

## 2. Arquitetura

### 2.1 Stack final

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | Next.js 15 (App Router, `output: 'export'`), React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix), Three.js + React Three Fiber, lucide-react, TanStack Table, Recharts, react-hook-form + zod | UI do totem, celular e admin |
| Auth operador | Supabase Auth (email + senha) | Login geral |
| Auth admin (modo elevado) | bcrypt (cost 12) + JWT HS256 short-lived 30min, validado em Edge Function | Modal de senha sobreposto |
| Auth jogador | UUID de sessão + JWT-Sessão (capability token) assinado HS256, TTL 5min | QR Code do totem |
| DB | Supabase Postgres com RLS | Eventos, prêmios, estoque, sessões, jogadas, ganhadores, auditoria |
| Lógica sensível | Edge Functions (Deno) + Postgres Functions (PL/pgSQL `SECURITY DEFINER`) | Sorteio, baixa de estoque, validação anti-fraude, geração de tokens |
| Realtime | Supabase Realtime (Postgres CDC, WebSocket) | Sincroniza totem ↔ celular |
| Storage | Supabase Storage | Fotos dos prêmios (webp 512×512 max, Q80) |
| Hosting | GitHub Pages | Estático |
| Deploy | GitHub Actions | Build + migrations Supabase + push para `gh-pages` |
| CLI | Node.js + Commander + TypeScript | Bootstrap, migrations, importar prêmios, definir senha admin, backup |
| Testes | Vitest (unit), Playwright (E2E + a11y), pgTAP (PL/pgSQL), fast-check (property-based), k6 (carga), OWASP ZAP (security) | Cobertura ≥80% total, ≥95% no núcleo |
| Monitoring | Sentry (frontend), Supabase Logs (Edge Functions), UptimeRobot (uptime) | Erros + disponibilidade |

### 2.2 Topologia de runtime

```
┌─────────────────┐         ┌─────────────────┐
│   TOTEM (TV)    │  WSS    │                 │   HTTPS
│  Next.js static │◀───────▶│    SUPABASE     │◀────── Celular do
│  Three.js R3F   │ Realtime│  Postgres + Auth│        Jogador
│  Touchscreen    │         │  Edge Functions │        (browser)
└─────────────────┘         │  Realtime CDC   │
                            │  Storage        │       ┌──────────────┐
┌─────────────────┐  HTTPS  │                 │  HTTPS│  Admin       │
│  Painel Admin   │◀───────▶│                 │◀──────│  (qualquer   │
│  Next.js static │         └─────────────────┘       │   browser)   │
└─────────────────┘                                   └──────────────┘
                                       ▲
                                       │ HTTPS via Service Role Key
                                       │
                                ┌──────────────┐
                                │  CLI (local) │
                                │  scripts dev │
                                └──────────────┘
```

### 2.3 Rotas Next.js

| Rota | Quem acessa | Proteção |
|---|---|---|
| `/login` | Operadores | Pública (login) |
| `/` | Operadores autenticados | Login geral |
| `/totem` | Operador (configura) → fica em loop attract | Login geral |
| `/admin/*` | Operador com modo admin ativo (JWT-Admin) | Login geral + modal de senha + RLS |
| `/jogar?s=<uuid>&t=<jwt>` | Jogador anônimo (escaneou QR) | Capability token (JWT-Sessão) |

### 2.4 Três identidades

| Identidade | Como autentica | Token | TTL | Permissões |
|---|---|---|---|---|
| **Operador** | E-mail + senha (Supabase Auth) | Supabase Access Token (JWT) | 1h | Acesso a `/`, `/totem`, criação de sessão, dashboard básico, marcar entrega |
| **Admin** (modo elevado) | Senha no modal (bcrypt) | JWT-Admin HS256 assinado por Edge Function | 30min | TUDO de operador + CRUD eventos/prêmios/lojas/operadores + ver auditoria + bloquear fingerprints |
| **Jogador anônimo** | Capability token no QR | JWT-Sessão HS256 (claim: `s`, `e`, `g`, `exp`, `nonce`) | 5min exatos | Ler dados da SUA sessão, submeter form 1 vez |

---

## 3. Modelo de dados

### 3.1 Princípios

- **Integridade vive no Postgres** (CHECK constraints, UNIQUE parciais, ENUMs, FK). RLS nunca substitui constraints estruturais.
- **Sorteio e baixa de estoque atômicos** — uma única transação PL/pgSQL.
- **Auditoria total** — cada ação sensível em `auditoria` (via trigger ou explicitamente).

### 3.2 DDL completo

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━ IDENTIDADE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE perfis_operadores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  convidado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton: 1 única senha do modo admin (modal)
CREATE TABLE admin_credenciais (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  senha_hash TEXT NOT NULL,                          -- bcrypt cost 12
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_por UUID REFERENCES auth.users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━ CATÁLOGO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cidade TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','ativo','pausado','encerrado')),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (data_fim >= data_inicio)
);
-- Só 1 evento "ativo" no sistema todo
CREATE UNIQUE INDEX unq_evento_ativo ON eventos(status) WHERE status = 'ativo';

CREATE TABLE premios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  foto_path TEXT,                                    -- Supabase Storage
  cor_hex TEXT CHECK (cor_hex ~ '^#[0-9A-Fa-f]{6}$'),
  peso_base INT NOT NULL DEFAULT 1 CHECK (peso_base >= 0),
  estoque_inicial INT NOT NULL CHECK (estoque_inicial >= 0),
  estoque_atual INT NOT NULL CHECK (estoque_atual >= 0),
  ordem_roleta INT NOT NULL DEFAULT 0,               -- posição da fatia
  e_premio_real BOOLEAN NOT NULL DEFAULT true,       -- false = "Não foi dessa vez"
  CHECK (estoque_atual <= estoque_inicial)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━ SESSÃO DE JOGO ━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TYPE sessao_status AS ENUM (
  'aguardando_celular',     -- QR visível, esperando scan
  'aguardando_dados',       -- celular abriu, form aberto
  'pronta_para_girar',      -- form submetido, totem deve girar
  'girando',                -- animação rodando
  'finalizada',             -- prêmio definido + ganhador registrado
  'expirada',               -- timeout 5 min
  'cancelada'               -- admin cancelou
);
CREATE TYPE jogo_tipo AS ENUM ('roleta','dados');

CREATE TABLE sessoes_jogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  jogo jogo_tipo NOT NULL,
  status sessao_status NOT NULL DEFAULT 'aguardando_celular',
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  liberada_por UUID NOT NULL REFERENCES auth.users(id),

  -- preenchido pelo celular:
  jogador_nome TEXT,
  jogador_telefone TEXT,
  jogador_email TEXT,
  jogador_loja_id UUID REFERENCES lojas(id),
  jogador_fingerprint TEXT,
  jogador_ip INET,
  jogador_user_agent TEXT,

  premio_sorteado_id UUID REFERENCES premios(id),
  girada_em TIMESTAMPTZ,
  finalizada_em TIMESTAMPTZ,

  CONSTRAINT dados_quando_pronta CHECK (
    status NOT IN ('pronta_para_girar','girando','finalizada')
    OR (jogador_nome IS NOT NULL AND jogador_telefone IS NOT NULL AND jogador_email IS NOT NULL)
  ),
  CONSTRAINT premio_quando_finalizada CHECK (
    status <> 'finalizada' OR premio_sorteado_id IS NOT NULL
  )
);

CREATE INDEX idx_sess_evento_status ON sessoes_jogo(evento_id, status);
CREATE INDEX idx_sess_expira
  ON sessoes_jogo(expira_em)
  WHERE status IN ('aguardando_celular','aguardando_dados');

-- Anti-fraude estrutural: 1 telefone só pode aparecer 1x por (evento, jogo) finalizado
CREATE UNIQUE INDEX unq_jogada_tel_evento_jogo
  ON sessoes_jogo(evento_id, jogo, jogador_telefone)
  WHERE status IN ('pronta_para_girar','girando','finalizada');

-- ━━━━━━━━━━━━━━━━━━━━━ GANHADORES E ANTI-FRAUDE ━━━━━━━━━━━━━━━━━━

CREATE TABLE ganhadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL UNIQUE REFERENCES sessoes_jogo(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  premio_id UUID NOT NULL REFERENCES premios(id),
  jogador_nome TEXT NOT NULL,
  jogador_telefone TEXT NOT NULL,
  jogador_email TEXT NOT NULL,
  jogador_loja_id UUID REFERENCES lojas(id),
  ganho_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue BOOLEAN NOT NULL DEFAULT false,
  entregue_em TIMESTAMPTZ,
  entregue_por UUID REFERENCES auth.users(id),
  observacoes TEXT
);
CREATE INDEX idx_ganh_evento ON ganhadores(evento_id);
CREATE INDEX idx_ganh_telefone ON ganhadores(jogador_telefone);

CREATE TABLE fingerprints_bloqueados (
  fingerprint TEXT PRIMARY KEY,
  motivo TEXT NOT NULL,
  bloqueado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_por UUID REFERENCES auth.users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━ AUDITORIA ━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE auditoria (
  id BIGSERIAL PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id),
  acao TEXT NOT NULL,
  ator UUID REFERENCES auth.users(id),
  recurso_tipo TEXT,
  recurso_id UUID,
  detalhes JSONB,
  ip INET,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_evento ON auditoria(evento_id);
CREATE INDEX idx_audit_data ON auditoria(criado_em DESC);
CREATE INDEX idx_audit_acao ON auditoria(acao);
```

### 3.3 Resumo das decisões estruturais

| Decisão | Razão |
|---|---|
| `UNIQUE (evento_id, jogo, telefone)` parcial em sessões finalizadas | Anti-fraude estrutural — banco recusa segunda jogada do mesmo número |
| `UNIQUE (status='ativo')` em eventos | Só 1 evento "rodando" — simplifica resolução do "evento atual" |
| `e_premio_real=false` para "Não foi dessa vez" | Tratado como prêmio normal, sem código especial em todo lugar |
| ENUM `sessao_status` com state machine | Transições validadas em PL/pgSQL |
| `auditoria` separada | Não afeta perf das tabelas operacionais; backup separável |
| Storage para `foto_path` | Fotos no Supabase Storage, não no Postgres |

---

## 4. Fluxo do jogo

### 4.1 State machine de `sessoes_jogo`

```
                ┌───────────────────────────────┐
                │   TELA DE BOAS-VINDAS         │
                │   "ROLETA DE PRÊMIOS"         │
                │   "TOQUE PARA PARTICIPAR"     │ ◄── attract loop
                │   (logo + altis-animacao.gif) │
                └──────────────┬────────────────┘
                               │ [cliente toca a tela]
                               ▼
                  [Edge Fn liberar-jogada cria sessão]
                               │
                               ▼
                  ┌─────────────────────┐
                  │ aguardando_celular  │  ◄── timer 5min
                  │ totem mostra QR     │
                  └──────┬────────┬─────┘
   [QR escaneado,        │        │  [5min OU admin cancelou]
    celular abre /jogar] │        │
                         ▼        ▼
              ┌─────────────────┐  ┌──────────────────┐
              │ aguardando_dados│  │ expirada /       │
              │ form aberto     │  │ cancelada        │ ◄── ESTADOS FINAIS
              └────────┬────────┘  └──────────────────┘
                       │
        [celular envia form válido]
        [SERVER SORTEIA + BAIXA ESTOQUE]
                       ▼
              ┌─────────────────────┐
              │ pronta_para_girar   │ ← premio_sorteado_id preenchido
              └──────────┬──────────┘
                         │ [totem detecta via Realtime → animação]
                         ▼
              ┌─────────────────────┐
              │     girando         │  3–7s
              │  Three.js spin      │  (cosmético — resultado já decidido)
              └──────────┬──────────┘
                         │ [animação termina]
                         ▼
              ┌─────────────────────┐
              │     finalizada      │  ← banner ganhador 25s
              └──────────┬──────────┘
                         │ [auto-retorno]
                         ▼
              ┌─────────────────────┐
              │ ⟲ volta à tela de   │
              │ boas-vindas attract │
              └─────────────────────┘
```

**Decisão crítica:** **o sorteio acontece no servidor no momento da submissão do formulário**, não quando a animação inicia. A animação é cosmética — aterrissa no resultado já decidido. Impede que o frontend influencie o sorteio mesmo em caso de adulteração.

### 4.2 Sequência completa (happy path Roleta)

| # | Ator | Ação |
|---|---|---|
| 1 | Cliente | Toca a tela do totem (attract mode) |
| 2 | Totem | `POST /functions/v1/liberar-jogada` (auth: JWT-Operador) |
| 3 | Edge Fn `liberar-jogada` | Busca evento ativo, INSERT sessão (`aguardando_celular`), gera JWT-Sessão, INSERT auditoria, retorna `{sessao_id, token}` |
| 4 | Totem | Renderiza QR com `https://altis-sistemas.github.io/altis-bet/jogar?s=<uuid>&t=<jwt>`, assina Realtime na linha |
| 5 | Cliente | Escaneia QR com celular |
| 6 | Celular | Abre URL, `POST /functions/v1/obter-sessao { s, t }` |
| 7 | Edge Fn `obter-sessao` | Valida assinatura JWT-Sessão + match `s`, UPDATE status=`aguardando_dados`, retorna sessão + prêmios + lojas |
| 8 | Totem | Recebe Realtime → UI muda para "Aguardando dados..." |
| 9 | Celular | Renderiza form, colhe device fingerprint (canvas+webgl+audio+screen+ua) |
| 10 | Celular | Cliente preenche e submete: `POST /functions/v1/submeter-dados { s, t, dados, fingerprint }` |
| 11 | Edge Fn `submeter-dados` | Valida token, valida formato (DDD/email/nome), valida fingerprint não bloqueado, valida não-duplicidade telefone, chama PL/pgSQL `sortear_e_baixar_estoque` |
| 11.a | PL/pgSQL | `SELECT FOR UPDATE` sessão + prêmios, calcula pesos efetivos, sorteia, baixa estoque, UPDATE sessão para `pronta_para_girar`, INSERT ganhador, INSERT auditoria, COMMIT |
| 12 | Totem (Realtime) | Detecta `pronta_para_girar` + `premio_sorteado_id`, calcula ângulo da fatia, inicia animação Three.js |
| 12.a | Totem | `POST /functions/v1/iniciar-animacao` → status=`girando` |
| 13 | Totem | Anima por 3-7s (ease-out cubic) |
| 14 | Totem | `POST /functions/v1/concluir-animacao` → status=`finalizada` |
| 15 | Totem | Banner do ganhador (25s) + confete; Celular (Realtime) mostra "Você ganhou X — retire com atendente" |
| 16 | Totem | Auto-retorno à tela attract |

### 4.3 Fluxos paralelos / edge cases principais

- **Expiração automática**: `pg_cron` a cada 60s — `UPDATE sessoes_jogo SET status='expirada' WHERE expira_em < NOW() AND status IN ('aguardando_celular','aguardando_dados')`.
- **Cancelamento manual**: botão no painel admin → `UPDATE status='cancelada'` (estoque preservado).
- **Reabertura**: operador toca novamente o totem → nova sessão com novo UUID/token.
- **Telefone duplicado**: UNIQUE constraint rejeita; Edge Function captura erro `23505` e retorna mensagem amigável.
- **Network drop no totem durante `girando`**: animação é local; ao reconectar, lê `finalizada` no DB e converge.
- **Totem crashou em `girando`**: `pg_cron` adicional move `girando > 30s atrás` para `finalizada` automaticamente.

(Tabela completa de 32 edge cases na Seção 8.)

---

## 5. Segurança e autenticação

### 5.1 Capability Token (JWT-Sessão) — proteção da rota `/jogar`

A rota `/jogar` **não é pública** no sentido frouxo. Ela requer um **token de capacidade** assinado pelo servidor, embutido no QR Code:

1. Quando o cliente toca o totem, Edge Function `liberar-jogada` gera o token:
   ```typescript
   payload = {
     s: sessao_uuid,
     e: evento_id,
     g: 'roleta',
     iat: now,
     exp: now + 5*60,                  // EXATAMENTE 5min
     nonce: random_bytes(16)           // anti-replay
   }
   token = jwt.sign(payload, SESSAO_JWT_SECRET, 'HS256')
   ```
2. QR contém `https://altis-sistemas.github.io/altis-bet/jogar?s=<uuid>&t=<token>`.
3. Toda chamada do celular envia `s` e `t` no body. Edge Functions validam:
   ```typescript
   const payload = jwt.verify(t, SESSAO_JWT_SECRET, { algorithms: ['HS256'] })
   if (payload.s !== s) throw new Error('Token não corresponde à sessão')
   ```
4. RLS adicional garante que mesmo via Supabase anon key direta, apenas a sessão correspondente é acessível.

### 5.2 JWT-Admin (modo elevado)

Estratégia: a Edge Function emite um JWT assinado com **`SUPABASE_JWT_SECRET`** (o mesmo segredo que o Supabase usa para validar `auth.jwt()`). Isso permite que RLS leia o claim `admin_elevado` diretamente, sem proxy. Frontend usa esse JWT-Admin no lugar do JWT-Operador para chamadas administrativas.

```typescript
// Edge Function: validar-senha-admin
// Headers: Authorization: Bearer <operador-supabase-jwt>
// Body: { senha: "plaintext" }

1. Valida JWT do operador (automático via Supabase client).
2. Anti brute-force:
   - Conta tentativas falhas no IP atual nas últimas 10min (SELECT auditoria WHERE acao='admin_login_falhou' AND ip=req.ip AND criado_em > NOW()-INTERVAL'10 min').
   - Se ≥5: INSERT auditoria (acao='admin_login_bloqueado'); return 429 { erro: "Muitas tentativas, tente em 30min" }.
3. SELECT senha_hash FROM admin_credenciais WHERE id=1.
4. const ok = await bcrypt.compare(req.body.senha, row.senha_hash).
5. Se falso:
     INSERT INTO auditoria (acao='admin_login_falhou', ator, ip, ua);
     sleep aleatório 500-1500ms;                          // anti timing attack
     return 401 { erro: "Senha inválida" }.
6. Se verdadeiro:
     INSERT INTO auditoria (acao='admin_login', ator, ip, ua);
     // JWT assinado com o MESMO segredo que Supabase usa para auth.jwt():
     payload = {
       sub: operador.id,            // mesmo operador
       role: 'authenticated',       // Supabase exige
       aud: 'authenticated',        // Supabase exige
       iat: now,
       exp: now + 30*60,
       admin_elevado: true,         // claim customizado lido por is_admin()
       jti: uuid()
     };
     token = jwt.sign(payload, Deno.env.get('SUPABASE_JWT_SECRET')!, 'HS256');
     return 200 { token, exp };
```

- Frontend guarda em **memória** (não localStorage — XSS risk). Curto TTL 30min.
- Frontend cria um cliente Supabase separado com este JWT (`createClient(url, anon, { global: { headers: { Authorization: 'Bearer <admin-jwt>' } } })`) para todas as chamadas administrativas. Cliente do operador é mantido em paralelo para chamadas normais.
- Após 30min: admin JWT expira; frontend automaticamente volta ao cliente operador. Para re-entrar no modo admin, reabrir modal.
- Após 5 falhas no mesmo IP em 10min → bloqueio HTTP 429 por 30min (computado no passo 2).
- Função Postgres `is_admin()`: `RETURN COALESCE((auth.jwt() ->> 'admin_elevado')::boolean, false);`

### 5.3 Políticas RLS

```sql
-- perfis_operadores
CREATE POLICY "operador_ve_proprio" ON perfis_operadores
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_ve_todos" ON perfis_operadores
  FOR ALL USING (is_admin());

-- admin_credenciais (só Edge Functions com service_role leem)
CREATE POLICY "admin_atualiza_senha" ON admin_credenciais
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- eventos, premios, lojas
CREATE POLICY "operador_le" ON <tabela>
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_cud" ON <tabela>
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- sessoes_jogo (anon NÃO tem policy — só Edge Functions)
CREATE POLICY "operador_le_sessoes" ON sessoes_jogo
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "operador_atualiza_propria_sessao" ON sessoes_jogo
  FOR UPDATE USING (liberada_por = auth.uid())
  WITH CHECK (liberada_por = auth.uid());

-- ganhadores
CREATE POLICY "operador_le_ganhadores" ON ganhadores
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "operador_marca_entrega" ON ganhadores
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- auditoria (só admin lê)
CREATE POLICY "admin_le_auditoria" ON auditoria
  FOR SELECT USING (is_admin());
```

### 5.4 Validações server-side (defesa contra manipulação frontend)

| Validação | Onde | O que rejeita |
|---|---|---|
| JWT-Operador válido | Supabase Auth automático | Operador deslogado / token expirado |
| JWT-Admin válido | Edge Functions admin | Operador sem modo admin tenta editar prêmio |
| JWT-Sessão válido (assinatura, exp, match `s`) | Edge Functions de jogador | QR forjado / vencido / outra sessão |
| Status da sessão é o esperado | Todas Edge Functions | Submeter em sessão já finalizada |
| Telefone DDD válido + 11 dígitos + começa com 9 | `submeter-dados` | Telefone inválido |
| E-mail regex válido | `submeter-dados` | E-mail malformado |
| Nome ≥3 chars, sem caracteres especiais perigosos | `submeter-dados` | Anti-injection cosmético |
| Fingerprint NÃO em `fingerprints_bloqueados` | `submeter-dados` | Dispositivo banido |
| UNIQUE (evento, jogo, telefone) | Constraint Postgres | Mesmo telefone 2ª jogada |
| Sorteio só em PL/pgSQL `SECURITY DEFINER` | DB | Frontend pedindo prêmio específico |
| Baixa de estoque dentro da mesma transação do sorteio | DB | Race condition |

### 5.5 Mitigações específicas

| Ataque | Mitigação |
|---|---|
| Forjar JWT-Sessão | Segredo 256 bits, HS256; chave no Supabase Vault |
| Replay JWT-Sessão | `nonce` + `exp` 5min + UNIQUE telefone |
| Bot scriptando submissões | Device fingerprint + rate limit por IP + blacklist manual |
| Manipular estoque via DevTools | Estoque nunca lido pra decisão no frontend — só decorativo |
| Manipular resultado da animação | Resultado em `premio_sorteado_id` (do servidor); animação só aterrissa |
| XSS roubando JWT-Admin | JWT em memória, CSP rigorosa, React escape padrão, TTL 30min |
| SQL injection | Sem queries dinâmicas — RPCs e ORM com parâmetros `$1`,`$2` |
| Brute force senha admin | Sleep 500-1500ms + log + bloqueio 5 falhas/10min |
| Vazamento do QR | TTL 5min + UNIQUE telefone + invalidação ao submeter |
| Operador desonesto | Auditoria completa: `liberar_jogada` e `cancelar` registram ator + IP + UA |
| MITM | HTTPS obrigatório + HSTS |

### 5.6 Segredos

**Supabase Vault** (criptografado em rest, lido pelas Edge Functions via `Deno.env.get`):
- `SUPABASE_JWT_SECRET` — já existe no projeto Supabase (não criamos). Edge Function `validar-senha-admin` o usa para assinar o JWT-Admin de modo que `auth.jwt()` consiga lê-lo.
- `SESSAO_JWT_SECRET` — 256 bits aleatórios, gerado no bootstrap. Usado APENAS pelo capability token do jogador (separado para que vazamento de um não comprometa o outro).
- `BCRYPT_PEPPER` — opcional, 32 bytes, concatenado à senha antes do bcrypt como defense in depth.

**Frontend** (só públicos):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**GitHub Actions**:
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`

### 5.7 Compliance LGPD

- Privacy Policy linkada no rodapé de `/jogar`; checkbox obrigatório "Li e aceito" no form.
- Finalidade: contato sobre prêmio + marketing Altis (opt-in separado se usar marketing).
- Retenção: dados de não-vencedores apagáveis após 90 dias do encerramento do evento (configurável).
- Direito à exclusão: endpoint admin `excluir-jogador-por-telefone` com auditoria.

---

## 6. Algoritmo de sorteio server-side

### 6.1 Algoritmo

```
Para cada prêmio com (estoque_atual > 0 OU e_premio_real = false) E peso_base > 0:
  Se e_premio_real:
    peso_efetivo[i] = peso_base[i] × estoque_atual[i]
  Senão ("Não foi dessa vez"):
    peso_efetivo[i] = peso_base[i]                  // sem multiplicar

Total = soma(peso_efetivo)
Sorteio = random() × Total
Acumulado = 0
Para cada prêmio em ordem determinística (ordem_roleta, id):
  Acumulado += peso_efetivo[i]
  Se Sorteio < Acumulado: vencedor = i, break
```

**Propriedade emergente importante:** prêmio com `estoque_atual=0` tem peso 0 → **nunca mais sai**. Elimina o edge case "ganhei prêmio esgotado" sem precisar de lógica de re-sorteio.

### 6.2 Função PL/pgSQL

```sql
CREATE OR REPLACE FUNCTION public.sortear_e_baixar_estoque(p_sessao_id UUID)
RETURNS TABLE (
  premio_id UUID,
  nome TEXT,
  cor_hex TEXT,
  foto_path TEXT,
  ordem_roleta INT,
  e_premio_real BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_evento_id UUID;
  v_status sessao_status;
  v_total NUMERIC;
  v_sorteio NUMERIC;
  v_acumulado NUMERIC := 0;
  v_escolhido_id UUID;
  v_escolhido_real BOOLEAN;
  v_premio RECORD;
BEGIN
  -- 1) Lock pessimista da sessão
  SELECT evento_id, status INTO v_evento_id, v_status
    FROM sessoes_jogo WHERE id = p_sessao_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão não encontrada' USING ERRCODE='P0002';
  END IF;
  IF v_status <> 'aguardando_dados' THEN
    RAISE EXCEPTION 'Status inválido: %', v_status USING ERRCODE='P0001';
  END IF;

  -- 2) Lock dos prêmios + cálculo de peso efetivo
  CREATE TEMP TABLE _sorteio_pool ON COMMIT DROP AS
    SELECT p.id, p.peso_base, p.estoque_atual, p.e_premio_real, p.ordem_roleta,
           CASE WHEN p.e_premio_real = false THEN p.peso_base::NUMERIC
                ELSE (p.peso_base * p.estoque_atual)::NUMERIC
           END AS peso_efetivo
      FROM premios p
     WHERE p.evento_id = v_evento_id
       AND (p.estoque_atual > 0 OR p.e_premio_real = false)
       AND p.peso_base > 0
     FOR UPDATE;

  SELECT COALESCE(SUM(peso_efetivo), 0) INTO v_total FROM _sorteio_pool;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Sem prêmios disponíveis' USING ERRCODE='P0001';
  END IF;

  v_sorteio := random() * v_total;

  FOR v_premio IN
    SELECT id, peso_efetivo, e_premio_real
      FROM _sorteio_pool ORDER BY ordem_roleta, id
  LOOP
    v_acumulado := v_acumulado + v_premio.peso_efetivo;
    IF v_sorteio < v_acumulado THEN
      v_escolhido_id := v_premio.id;
      v_escolhido_real := v_premio.e_premio_real;
      EXIT;
    END IF;
  END LOOP;

  IF v_escolhido_id IS NULL THEN
    RAISE EXCEPTION 'Falha interna no sorteio' USING ERRCODE='P0001';
  END IF;

  -- 3) Baixa estoque só se prêmio real
  IF v_escolhido_real THEN
    UPDATE premios SET estoque_atual = estoque_atual - 1
     WHERE id = v_escolhido_id AND estoque_atual > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Concorrência: estoque zerou' USING ERRCODE='40001';
    END IF;
  END IF;

  -- 4) Atualiza sessão
  UPDATE sessoes_jogo
     SET premio_sorteado_id = v_escolhido_id,
         status = 'pronta_para_girar',
         girada_em = NOW()
   WHERE id = p_sessao_id;

  -- 5) Insere ganhador (sempre, mesmo "Não foi dessa vez")
  INSERT INTO ganhadores (sessao_id, evento_id, premio_id,
                          jogador_nome, jogador_telefone, jogador_email, jogador_loja_id)
    SELECT s.id, s.evento_id, v_escolhido_id,
           s.jogador_nome, s.jogador_telefone, s.jogador_email, s.jogador_loja_id
      FROM sessoes_jogo s WHERE s.id = p_sessao_id;

  -- 6) Auditoria
  INSERT INTO auditoria (evento_id, acao, recurso_tipo, recurso_id, detalhes)
    VALUES (v_evento_id, 'sortear', 'sessoes_jogo', p_sessao_id,
            jsonb_build_object(
              'premio_id', v_escolhido_id,
              'total_peso', v_total,
              'sorteio', v_sorteio,
              'acumulado_final', v_acumulado,
              'e_premio_real', v_escolhido_real
            ));

  -- 7) Retorna detalhes para a animação
  RETURN QUERY
    SELECT p.id, p.nome, p.cor_hex, p.foto_path, p.ordem_roleta, p.e_premio_real
      FROM premios p WHERE p.id = v_escolhido_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sortear_e_baixar_estoque(UUID) TO service_role;
```

### 6.3 Exemplo numérico (calibração)

Evento: 100 Vales R$10 (peso 1), 20 Camisetas (peso 2), 1 TV (peso 10), "Não foi" (peso 30).

| Estado | Vale | Camiseta | TV | Não foi | Total | P(TV) | P(Não foi) |
|---|---|---|---|---|---|---|---|
| Início | 100 | 40 | 10 | 30 | 180 | 5.6% | 16.7% |
| 50 vales saíram | 50 | 40 | 10 | 30 | 130 | 7.7% | 23.1% |
| TV saiu | 30 | 30 | 0 | 30 | 90 | 0% | 33.3% |

**Propriedade**: prêmios raros mantêm probabilidade aproximadamente estável conforme outros consomem; "Não foi" preenche a folga.

### 6.4 Fonte de aleatoriedade

`random()` do Postgres (Mersenne Twister, 53 bits). Não-criptográfico mas suficiente — seed nunca exposto ao cliente. Não há alvo financeiro direto.

Função aceita `p_seed FLOAT DEFAULT NULL` para testes reproduzíveis (via `setseed(p_seed)`).

### 6.5 Preview de probabilidades no painel admin

O painel admin tem widget "Probabilidades agora" que calcula `peso_efetivo` para o evento ativo em tempo real e mostra como barras horizontais com %. Atualizado a cada sorteio. Útil para calibração manual.

---

## 7. UI do totem (Three.js)

### 7.1 Biblioteca

**React Three Fiber (R3F) + drei + GSAP**, não Three.js vanilla.

### 7.2 Geometria

- Roleta como disco vertical (`CylinderGeometry` ou `RingGeometry`) virada para a câmera, eixo Z.
- N fatias dinâmicas a partir de `premios` ordenados por `ordem_roleta`.
- Ponteiro triangular fixo no topo (referência de "qual fatia ganhou").
- Centro: logo Altis com rotação suave.
- Cor: `premios.cor_hex` (paleta `#4afad4`/`#009993` como base). Foto: textura no slot via Supabase Storage; sem foto → texto do nome.

### 7.3 Animação determinística

```typescript
// Quando totem recebe sessoes_jogo com status='pronta_para_girar':
const totalFatias = premios.length
const anguloFatia = (Math.PI * 2) / totalFatias
const premioIndex = premios.findIndex(p => p.id === premio_sorteado_id)
const anguloAlvo = -(premioIndex * anguloFatia + anguloFatia / 2) + Math.PI / 2
const voltas = 6 + Math.random() * 2
const rotacaoFinal = anguloAlvo + voltas * Math.PI * 2
const jitter = (Math.random() - 0.5) * anguloFatia * 0.6

gsap.to(rodaRef.current.rotation, {
  z: rotacaoFinal + jitter,
  duration: 5,
  ease: 'power3.out',
  onComplete: () => triggerConcluirAnimacao(sessao_id)
})
```

### 7.4 Estados visuais do totem

| Estado | UI principal |
|---|---|
| attract | Roleta girando lentamente em loop, "TOQUE PARA PARTICIPAR" pulsante, `logo.svg` grande, `altis-animacao.gif` no canto |
| aguardando_celular | QR Code central grande, contador 5:00, "Aponte a câmera do celular aqui", roleta diminuída no fundo |
| aguardando_dados | Mesma tela com mensagem "Aguardando dados do jogador..." + loading sutil |
| pronta_para_girar / girando | Roleta em foco, "Boa sorte, <Nome>!", confete subtle, roleta gira |
| finalizada | Banner com nome + foto + "Parabéns, <Nome>! Você ganhou: <Prêmio>!" + confete pesado + contador "Voltando em 25s..." (para "Não foi": "Não foi dessa vez, <Nome>! Obrigado por participar.") |
| erro / desconectado | Overlay "⚠ Reconectando..." bloqueia toques |

### 7.5 Performance

- Target: 60fps em mini-PC Intel N100 / Mac mini equivalente.
- Câmera ortográfica (sem perspectiva).
- Texturas pré-processadas no upload: webp 512×512 Q80 (Edge Function `processar-imagem`).
- Geometry pooling (BufferGeometry reaproveitada).
- Sem shadows, sem postprocessing em attract.
- DPR limitado a 2.
- R3F `frameloop="demand"` fora de `attract`/`girando`.

### 7.6 Acessibilidade

- `prefers-reduced-motion`: sem animação rotativa, fade-in do prêmio em 1s.
- `prefers-contrast: more`: bordas pretas 3px nas fatias + texto bold.
- Screen reader: `<div aria-live="polite">` anuncia "Resultado: <Nome> ganhou <Prêmio>".
- Keyboard: Espaço/Enter também dispara (alternativa ao toque).
- Foco visível com alta saturação.

### 7.7 Estrutura de componentes

```
app/totem/
├─ page.tsx                  Container, gerencia Realtime + estado
├─ AttractMode.tsx           Tela "TOQUE PARA PARTICIPAR" + loop
├─ QrCodeScreen.tsx          QR + contador + texto
├─ RoletaCanvas.tsx          <Canvas> R3F root
│  ├─ Roda.tsx               Geometria das fatias + textura
│  ├─ Ponteiro.tsx           Triângulo fixo
│  ├─ Confete.tsx            Partículas R3F (instancing)
│  └─ EixoCentro.tsx         Logo Altis + animação
├─ BannerGanhador.tsx        Resultado pós-animação
└─ ErroOverlay.tsx           "Reconectando..."
```

---

## 8. Painel administrativo

### 8.1 Layout pós-login (`/`)

```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo Altis]  Altis Bet               [🛡 Admin] [👤 João]       │
├──────────────────────────────────────────────────────────────────┤
│  Bem-vindo, João                                                 │
│  Evento ativo: <nome>                                            │
│                                                                  │
│  ╔═════════════════════╗   ╔═════════════════════╗               │
│  ║  🎰 ROLETA DE      ║   ║  🎲 DADOS DA SORTE  ║               │
│  ║      PRÊMIOS        ║   ║   (em breve)        ║               │
│  ║  [ ABRIR TOTEM ]    ║   ║   indisponível      ║               │
│  ╚═════════════════════╝   ╚═════════════════════╝               │
└──────────────────────────────────────────────────────────────────┘
```

- "Abrir Totem" leva para `/totem` em fullscreen.
- Botão "Dados" desabilitado (Spec 2 ainda não implementado).
- Ícone 🛡 Admin abre **modal de senha** (não navega).

### 8.2 Modal de senha admin

```
       ┌──────────────────────────────────┐
       │  🔒 Modo Administrador        ✕  │
       ├──────────────────────────────────┤
       │   Esta área é restrita.          │
       │   Digite a senha de admin:       │
       │   [ •••••••••• 👁 ]             │
       │   ⚠ 5 tentativas falhas →       │
       │     IP bloqueado 30min          │
       │   [ Cancelar ] [ Desbloquear ]  │
       └──────────────────────────────────┘
```

Sucesso: header ganha badge **🛡 Modo Admin ativo 29:42** + botão "Sair do modo admin".

### 8.3 Abas do painel admin (`/admin`)

| Aba | Conteúdo |
|---|---|
| 📊 Dashboard | Filtro por evento; resumo (jogadas, ganhadores, entregues, telefones únicos); barras de estoque + probabilidades atuais; gráfico jogadas/hora; tabela últimas 10 jogadas; exportar CSV |
| 🎯 Eventos | CRUD de eventos; só 1 ativo por vez; validação obrigatória pra ativar (≥1 prêmio real + ≥1 slot "Não foi") |
| 🎁 Prêmios | Lista por evento, drag-and-drop reordenação; foto/cor/peso/estoque/slot; upload via Supabase Storage (Edge Fn `processar-imagem`) |
| 👥 Operadores | Lista, convidar por e-mail (Supabase Auth invite), desativar, reenviar convite |
| 🏆 Ganhadores / Entrega | Filtro por status; botão "Marcar entregue" com modal de confirmação + observações |
| 📋 Auditoria | Read-only, paginada, filtros por data/ator/ação; expande JSON `detalhes` |
| ⚙ Configurações | Trocar senha admin; CRUD de lojas; preferências (timeout sessão, tempo banner); bloqueio/desbloqueio de fingerprints |

### 8.4 Permissões resumidas

| Ação | Operador | Admin |
|---|---|---|
| Login + acesso ao site | ✅ | ✅ |
| Abrir/operar `/totem` | ✅ | ✅ |
| Ver Dashboard | ✅ (evento atual) | ✅ (todos) |
| Marcar entrega | ✅ | ✅ |
| CRUD eventos/prêmios/lojas | ❌ | ✅ |
| Convidar operadores | ❌ | ✅ |
| Ver auditoria | ❌ | ✅ |
| Trocar senha admin | ❌ | ✅ |
| Bloquear fingerprint | ❌ | ✅ |

---

## 9. Edge cases e resiliência

### 9.1 Tabela de edge cases

| # | Cenário | Comportamento |
|---|---|---|
| 1 | QR escaneado depois de 5min | Celular mostra "Sessão expirada, volte ao totem"; botão sem ação |
| 2 | Sessão expira durante preenchimento | Modal bloqueante; form desabilitado; dados NÃO preservados (LGPD) |
| 3 | 2 celulares escaneando mesmo QR | 1º sucede; 2º vê "Esta sessão já está sendo usada" |
| 4 | Double-click no submit | `SELECT FOR UPDATE` serializa; 2ª retorna 409; frontend desabilita botão também |
| 5 | Telefone duplicado | UNIQUE constraint rejeita; mensagem amigável |
| 6 | Jogador fecha browser | `pg_cron` finaliza sessão em até 60s após `expira_em` |
| 7 | Admin cancela jogada | UPDATE status='cancelada' → totem volta ao attract via Realtime |
| 8 | Prêmio esgota durante cálculo | Lock pessimista garante snapshot consistente |
| 9 | Admin reduz estoque durante jogada | UPDATE espera lock liberar (sequencial) |
| 10 | Todos estoques zerados + sem "Não foi" | Erro P0001 → mensagem "Evento concluído!" + badge no admin |
| 11 | INSERT em `ganhadores` falha | Transação aborta toda; estoque NÃO baixa; frontend mostra retry |
| 12 | Totem perde WebSocket | Overlay "Reconectando..."; backoff exponencial 1s,2s,4s,...,30s |
| 13 | Celular perde rede no envio | Modal "Sem conexão"; retry manual |
| 14 | Totem crashou em `girando` | `pg_cron` move `girando >30s` para `finalizada`; refresh do totem converge |
| 15 | Edge Function timeout >30s | 504 → retry automático 1x → erro genérico se falhar |
| 16 | Operador é desativado durante operação | Próxima requisição 401 → desloga; sessão atual finaliza naturalmente |
| 17 | JWT-Admin expira mid-action | Modal "Modo admin expirou. Digite a senha novamente." mantém estado |
| 18 | JWT-Sessão interceptado | TLS protege; UNIQUE telefone impede 2ª jogada; atacante no máximo vê os prêmios |
| 19 | Login concorrente 2 dispositivos | Aceito; ambos JWTs válidos; auditoria registra IPs distintos |
| 20 | Foto do prêmio quebrada | Fallback: só nome+cor; admin recebe alerta na lista |
| 21 | Upload de imagem gigante (>5MB) | Edge Function `processar-imagem` rejeita com erro amigável |
| 22 | Prêmio sem foto | Fatia mostra só cor + nome; banner ganhador usa 🎁 |
| 23 | 2 operadores ativando evento simultaneamente | UNIQUE `unq_evento_ativo` rejeita o 2º |
| 24 | Mesmo telefone em 2 sessões `aguardando_dados` | Coexistem até uma submeter; 1ª sucede, 2ª erro 409 |
| 25 | Acesso direto a `/admin` sem JWT-Admin | `AdminGuard` client + RLS no servidor — visual + dados protegidos |
| 26 | Tentar excluir prêmio já saiu | Botão desabilitado; FK previne; usar status (futuro `arquivado`) |
| 27 | Trocar senha admin durante sessão admin de outro | Outros continuam até JWT-Admin expirar |
| 28 | Hard delete de evento | Confirmação dupla na UI; recomendado `status='encerrado'` |
| 29 | Android antigo sem canvas fingerprint | Fallback hash de `ua+screen+tz+lang` |
| 30 | `/jogar` sem `s`/`t` | Mensagem genérica "Toque o totem para participar" |
| 31 | `/jogar?s=fake&t=fake` | 401 mensagem genérica (não vaza pista) |
| 32 | Modo claro/escuro diferente entre totem e celular | Independente; paleta funciona em ambos |

### 9.2 Padrões transversais

- **Idempotência** em todas Edge Functions que mudam estado.
- **Mensagens user-friendly** em PT-BR; detalhes técnicos só no console/Sentry.
- **Logging**: Sentry (frontend, PII redacted), Supabase Logs (Edge Fn, `req_id` correlacionado), `auditoria` (DB).
- **Compensação automática** via `pg_cron` (60s):
  - Expira sessões `aguardando_*` vencidas
  - Finaliza `girando >30s`
  - Cleanup de `expirada`/`cancelada` >30 dias (configurável)
- **Circuit breaker Realtime**: 3 falhas em 60s → polling 2s automático; ícone "📡 modo polling" discreto.

---

## 10. Estratégia de testes

### 10.1 Pirâmide

```
        ▲
       ╱ ╲  Smoke E2E (Playwright) ~10
      ╱───╲
     ╱ Int ╲   Integração (Vitest + Supabase test) ~50
    ╱───────╲
   ╱  Unit + ╲   Unit (Vitest) ~200 + pgTAP ~50
  ╱___pgTAP__ ╲
   Property-based (fast-check) ~10
```

### 10.2 Ferramentas

| Camada | Tool |
|---|---|
| Unit JS/TS | Vitest |
| Component React | Vitest + Testing Library |
| DB (PL/pgSQL + constraints) | pgTAP |
| Edge Functions | Vitest + supabase-js + test DB local |
| E2E | Playwright (multi-context: totem + celular) |
| Property-based | fast-check |
| Load | k6 |
| Security | OWASP ZAP baseline em CI + pentest manual |
| Acessibilidade | axe-core + Playwright |
| Visual regression | Playwright screenshot (telas críticas) |

### 10.3 Cenários críticos obrigatórios (resumo)

**Sorteio:** distribuição convergente (10k sorteios), prêmio esgotado nunca sai, estoque não-negativo, seed reproduzível, "Não foi" sempre considerado, erro quando total_peso=0.

**Capability Token:** rejeita forjado, expirado, mismatch `s`, reuso pós-submit, 2 celulares (corrida).

**Anti-fraude:** telefone duplicado bloqueado, mesmo telefone OK em jogos diferentes, DDD inválido rejeitado, fingerprint blacklisted rejeitado, e-mail malformado rejeitado.

**State machine:** transições válidas, transições inválidas (finalizada→girando) rejeitadas, sessão expirada não aceita submissão, cancelamento propaga via Realtime.

**Auth:** brute force gera sleep + log, senha correta gera JWT-Admin válido, operador sem admin NÃO edita prêmios, admin edita OK, anon NÃO acessa `sessoes_jogo` direto.

**Concorrência:** 100 sorteios simultâneos sem dupla baixa (k6), 2 cancelamentos da mesma sessão (1 vence), admin reduz estoque mid-jogada (serializado).

**E2E:** happy path completo (totem + celular), reduced-motion, axe sem violations AA, modo escuro `#009993`, mensagens genéricas em erro.

**Security:** XSS escapado no banner, SQL injection inerte, CSP bloqueia inline, HSTS header presente.

**A11y específico:** contraste — atenção `#4afad4` (claro) com texto branco **não atinge 4.5:1**; texto sobre paleta clara precisa ser `#0d5d56` ou similar.

### 10.4 Coverage targets

| Tipo | Mínimo | Justificativa |
|---|---|---|
| Funções PL/pgSQL críticas | 95% linhas | Núcleo da integridade |
| Edge Functions | 90% linhas | Camada de fronteira |
| Utilitários TS | 90% | Lógica determinística |
| Componentes React | 70% branches | Foco em lógica condicional |
| Total | 80% | Realista para MVP |

### 10.5 CI/CD jobs

| Job | Tempo aprox | O que faz |
|---|---|---|
| lint-typecheck | 30s | ESLint + `tsc --noEmit` |
| unit | 1min | Vitest com coverage |
| pgtap | 2min | Supabase local + pgTAP |
| edge-functions | 3min | Vitest contra Supabase local |
| e2e-smoke | 5min | Playwright happy path + admin |
| a11y | 2min | axe-core em todas rotas admin |
| security-scan | 3min | OWASP ZAP baseline + `npm audit` |
| build | 2min | `next build` (output: export) |
| deploy-staging | auto | branch develop → preview Pages |
| deploy-prod | manual | main após approval → gh-pages |

PR exige todos verdes; coverage report comentado no PR.

### 10.6 Fora do escopo de testes no MVP

- Snapshots de componentes (frágil)
- Mutation testing (custo/benefício ruim)
- Cross-browser exaustivo (testa Chrome Android + Safari iOS apenas)
- Pentest contratado externo (defer pós-MVP)

---

## 11. Deploy e CLI

### 11.1 Estrutura de repositório

```
altis-bet/
├─ .github/workflows/
│  ├─ ci.yml
│  ├─ deploy-staging.yml
│  ├─ deploy-production.yml
│  ├─ supabase-migrate.yml
│  └─ backup-diario.yml
├─ src/
│  └─ app/
│     ├─ (auth)/login/
│     ├─ (autenticado)/
│     │  ├─ page.tsx              ← tela boas-vindas
│     │  ├─ totem/
│     │  └─ admin/
│     └─ jogar/                   ← rota do celular
├─ supabase/
│  ├─ migrations/
│  ├─ functions/                  ← Edge Functions Deno
│  │  ├─ liberar-jogada/
│  │  ├─ obter-sessao/
│  │  ├─ submeter-dados/
│  │  ├─ validar-senha-admin/
│  │  ├─ iniciar-animacao/
│  │  ├─ concluir-animacao/
│  │  ├─ processar-imagem/
│  │  └─ _shared/
│  ├─ tests/                      ← pgTAP
│  └─ seed.sql
├─ tests/                         ← E2E + integração + load
├─ cli/
│  ├─ bin/altis-bet.ts
│  └─ commands/
├─ public/
│  ├─ logo.svg
│  ├─ altis-animacao.gif
│  └─ favicon.ico
├─ docs/superpowers/specs/        ← este documento
├─ next.config.js
├─ tailwind.config.ts
├─ package.json
└─ .env.local.example
```

### 11.2 `next.config.js`

```javascript
const isProd = process.env.NODE_ENV === 'production'
const repo = 'altis-bet'

module.exports = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  experimental: { typedRoutes: true },
}
```

### 11.3 Limitações do static export e workarounds

| Limitação | Solução |
|---|---|
| Sem API Routes | Tudo backend em Supabase Edge Functions |
| Sem middleware Next | Auth guard client-side + RLS no Postgres |
| Sem ISR/SSR | Conteúdo dinâmico via hooks client |
| Sem `next/image` otimizado | Imagens pré-processadas no upload |
| Sem variáveis runtime | Apenas `NEXT_PUBLIC_*` em build |

### 11.4 Branch strategy

- `main` → produção (publish `gh-pages`)
- `develop` → staging (publish `gh-pages-staging`)
- `feature/*` → PRs contra `develop`
- Tag `v*` em `main` → release notes auto

### 11.5 Pipeline de produção (`.github/workflows/deploy-production.yml`)

```yaml
on:
  push:
    branches: [main]

jobs:
  test:
    uses: ./.github/workflows/ci.yml

  migrate:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      - run: supabase db push
      - run: supabase functions deploy
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  build:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./out }

  deploy:
    needs: build
    permissions: { pages: write, id-token: write }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

**Ordem:** migrations aplicam **antes** do deploy frontend. Frontend novo nunca pega DB schema velho.

### 11.6 Secrets do GitHub Actions

| Nome | Onde |
|---|---|
| `SUPABASE_URL` | Build frontend |
| `SUPABASE_ANON_KEY` | Build frontend |
| `SUPABASE_ACCESS_TOKEN` | Migrate / deploy functions |
| `SUPABASE_PROJECT_REF` | Migrate / deploy functions |
| `SUPABASE_DB_PASSWORD` | Backup (opcional) |
| `SENTRY_DSN` | Frontend (opcional) |

### 11.7 CLI mínima (MVP)

Pacote `@altis/bet-cli`, executado via `npx altis-bet`.

| Comando | Descrição |
|---|---|
| `altis-bet bootstrap` | Setup inicial — cria `.env.local`, roda 1ª migration, seed, pergunta criação de senha admin |
| `altis-bet migrate up` | Aplica migrations pendentes |
| `altis-bet migrate status` | Lista migrations aplicadas |
| `altis-bet import-premios <arquivo.csv>` | Importa prêmios em lote |
| `altis-bet definir-senha-admin` | Pede senha (oculta), bcrypt cost 12, grava |
| `altis-bet backup [--saida ./backups/]` | Dump JSON read-only com telefones mascarados |
| `altis-bet --version` / `--help` | Padrão |

**Fora do MVP** (Spec 3): `reset --evento`, `gerar-jogadas-fake`, `exportar-excel`, `restore`, `generate-types`.

### 11.8 Bootstrap (primeira execução)

```bash
git clone <repo>
cd altis-bet
npm install

# Criar projeto Supabase manualmente (1 vez por ambiente):
# https://app.supabase.com → New Project

npx altis-bet bootstrap
# > Cola SUPABASE_URL
# > Cola SUPABASE_SERVICE_ROLE_KEY
# > Gera .env.local
# > Aplica migrations
# > Cria evento exemplo + slot "Não foi" + define senha admin (perguntas Y/n)

npm run dev   # localhost:3000

# Convidar primeiro operador via painel admin após login
```

### 11.9 Backup

- **Automático**: GitHub Action diária (02:00 BRT) → `npx altis-bet backup` → artifact 90 dias.
- **Sob demanda**: `npx altis-bet backup` local.
- **DB do Supabase**: Supabase já faz daily backup automático (7d Free / 30d Pro).

### 11.10 Monitoring (mínimo MVP)

| O quê | Como | Reação |
|---|---|---|
| Erros frontend | Sentry free (5K events) | E-mail admin se >5 erros/min |
| Logs Edge Functions | Supabase Logs UI | Verificação manual |
| Disponibilidade | UptimeRobot free (5min) | E-mail/SMS se site cai |
| Métricas DB | Supabase dashboard nativo | Verificação manual |

### 11.11 Custos esperados

| Item | Plano | Custo/mês |
|---|---|---|
| Supabase | Free (500MB DB, 1GB storage, 2GB bandwidth) | R$ 0 |
| Supabase Pro (se ultrapassar) | $25 | ~R$ 140 |
| GitHub Pages | Free público | R$ 0 |
| Domínio customizado | Anual ~R$ 50 | R$ 4 amortizado |
| Sentry | Developer free | R$ 0 |
| UptimeRobot | Free | R$ 0 |
| **Total inicial** | | **R$ 0–140/mês** |

---

## 12. Decisões pendentes (não bloqueantes)

| Decisão | Quando decidir |
|---|---|
| Domínio customizado (`bet.altis.com.br`) vs `altis-sistemas.github.io/altis-bet` | Pré-lançamento |
| Plano Supabase (Free vs Pro) | Após estimar volume do 1º evento |
| Repo público vs privado | Antes do 1º commit — **recomendado privado** (decisões anti-fraude expostas) |
| Sentry vs LogRocket vs próprio | Pós-MVP, baseado em volume de erros |
| Reintroduzir OTP por SMS? | Após observar tentativas reais de fraude no 1º evento |

---

## 13. Sequência de implementação sugerida

Ordem que prioriza a **fundação confiável** primeiro e adiciona UI depois:

1. **Setup do repo**
   - Inicializar Next.js + Tailwind + shadcn/ui
   - Configurar `output: 'export'` e GitHub Pages
   - Configurar GitHub Actions básicos (lint + typecheck)
   - Adicionar paleta e logo em `public/`
2. **Supabase project**
   - Criar projeto, configurar Vault com segredos
   - Migration 1: schema base (perfis, admin_credenciais, lojas, eventos, premios, sessoes_jogo, ganhadores, fingerprints_bloqueados, auditoria)
   - Migration 2: RLS policies
   - Migration 3: função `sortear_e_baixar_estoque` + `is_admin()`
   - Migration 4: `pg_cron` jobs de expiração/limpeza
   - Seed inicial: paleta, exemplo de evento, slot "Não foi dessa vez" padrão
3. **Edge Functions (TDD)**
   - `validar-senha-admin` (com testes)
   - `liberar-jogada` (com testes)
   - `obter-sessao` (com testes)
   - `submeter-dados` (com testes — inclui validações de telefone, fingerprint, anti-duplicidade)
   - `iniciar-animacao` + `concluir-animacao`
   - `processar-imagem`
4. **CLI mínima**
   - `bootstrap`, `migrate`, `definir-senha-admin`, `import-premios`, `backup`
5. **UI — login + tela de boas-vindas**
   - Página `/login` (Supabase Auth)
   - Página `/` (boas-vindas com Roleta/Dados + ícone admin + modal)
   - Componente `AdminGuard`
6. **UI — totem**
   - Página `/totem` com attract mode
   - QR Code com capability token
   - R3F + drei + GSAP — Roleta 3D
   - Subscription Realtime
   - Estados visuais (attract → QR → aguardando → girando → banner)
   - Auto-retorno após `finalizada`
7. **UI — celular do jogador**
   - Página `/jogar` com validação de capability token
   - Formulário com react-hook-form + zod
   - Device fingerprinting client-side
   - Mensagens de resultado / erros / expiração
8. **Painel admin**
   - Layout sidebar
   - Aba Dashboard (métricas + probabilidades em tempo real)
   - Aba Eventos (CRUD)
   - Aba Prêmios (CRUD + upload Storage + drag-and-drop)
   - Aba Operadores (convidar via Supabase Auth invite)
   - Aba Ganhadores / Entrega
   - Aba Auditoria
   - Aba Configurações (trocar senha admin + lojas + bloqueios)
9. **Testes E2E completos**
   - Playwright happy path (totem + celular)
   - axe-core a11y
   - Cenários de erro
10. **Deploy + smoke production**
    - Pipeline GitHub Actions completo
    - Deploy staging → validação manual → main → produção
    - Sentry + UptimeRobot setup
11. **Documentação de operação**
    - README com bootstrap
    - Runbook de troubleshooting comum
    - Manual do admin (para usuários Altis)

---

## 14. Assets pré-existentes

- `C:\Users\Altis\Documents\Logo\logo.svg` → copiar para `public/logo.svg`
- `C:\Users\Altis\Documents\Logo\altis-animacao.gif` → copiar para `public/altis-animacao.gif`

---

## 15. Glossário

| Termo | Definição |
|---|---|
| **Operador** | Usuário Altis logado via e-mail/senha. Pode operar o totem e ver dashboard básico. |
| **Admin** | Modo elevado de um operador, ativado por modal de senha. JWT-Admin 30min. |
| **Jogador** | Cliente anônimo que escaneou QR do totem. Identificado apenas por sessão. |
| **Totem** | Dispositivo grande com touchscreen, roda `/totem` em fullscreen, exibe roleta 3D. |
| **Evento** | Período de operação com seu próprio catálogo de prêmios. Só 1 ativo por vez. |
| **Sessão de jogo** | Uma tentativa única ligada a um QR Code; tem state machine. |
| **Capability token** | JWT-Sessão assinado pelo servidor, embutido no QR, exigido para todas RPCs do celular. |
| **Slot "Não foi dessa vez"** | Linha em `premios` com `e_premio_real=false`; sai no sorteio mas não gera prêmio físico. |
| **Peso efetivo** | `peso_base × estoque_atual` para prêmio real; `peso_base` puro para slot vazio. |
| **Attract mode** | Tela de boas-vindas do totem em loop, "TOQUE PARA PARTICIPAR". |
| **Modo elevado / admin ativo** | Estado em que o operador tem JWT-Admin válido em memória. |
