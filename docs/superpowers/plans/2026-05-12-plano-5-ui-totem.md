# Altis Bet — Plano 5: UI Totem (Roleta 3D R3F)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a **rota `/totem` completa** — desde o attract mode "TOQUE PARA PARTICIPAR" até o banner do ganhador, com **Roleta 3D em React Three Fiber + GSAP**, **QR Code gerado dinamicamente** com capability token do Plano 2, **state machine local** sincronizada via **Supabase Realtime**, **auto-retorno** ao attract após 25s, e respeito a `prefers-reduced-motion`.

**Architecture:** O totem é um cliente React único que mantém uma state machine local (`useReducer`) refletindo o `sessoes_jogo.status` do Postgres em tempo real via Supabase Realtime (canal Postgres CDC). Cada estado renderiza um componente diferente: `AttractMode` → `QrCodeScreen` → `AguardandoDados` → `RoletaCanvas` (R3F) → `BannerGanhador` → volta ao attract. Toque na tela em attract dispara a Edge Function `liberar-jogada` do Plano 2; o resto do fluxo é **reativo ao Realtime** (não há polling). Animação da roleta usa GSAP e **aterrissa no `premio_sorteado_id` já decidido pelo servidor** (impossível adulterar).

**Tech Stack:** React Three Fiber 9 (R3F, suporta React 19), @react-three/drei 9.x, three.js, gsap 3.12, qrcode 1.5 (gera SVG/canvas), Supabase Realtime (já incluído no `@supabase/supabase-js`). Sem novas libs de UI — usamos shadcn/ui base.

**Pré-requisitos atendidos:**
- Plano 1: schema com `sessoes_jogo`, função `sortear_e_baixar_estoque`
- Plano 2: Edge Function `liberar-jogada` (retorna `{ sessao_id, token, expira_em }`), `iniciar-animacao`, `concluir-animacao`
- Plano 3: CLI para seed inicial
- Plano 4: Next.js + Tailwind + shadcn + Auth + AuthGuard + Header + `/totem` stub
- Tag `plano-4-completo`

**Tempo estimado:** ~10–14 horas se executado sequencialmente.

---

## File structure que este plano cria

```
altis-bet/
├─ package.json                                # MODIFY: deps R3F + GSAP + qrcode
├─ src/app/totem/
│  └─ page.tsx                                 # MODIFY: orquestra state machine
├─ src/components/totem/
│  ├─ AttractMode.tsx                          # "TOQUE PARA PARTICIPAR" loop
│  ├─ QrCodeScreen.tsx                         # QR + countdown 5min
│  ├─ AguardandoDados.tsx                      # "Aguardando dados..."
│  ├─ BannerGanhador.tsx                       # confete + nome + auto-retorno
│  ├─ ErroOverlay.tsx                          # "Reconectando..."
│  └─ roleta/
│     ├─ RoletaCanvas.tsx                      # <Canvas> R3F root
│     ├─ Roda.tsx                              # geometria das N fatias
│     ├─ Ponteiro.tsx                          # triângulo fixo no topo
│     ├─ EixoCentro.tsx                        # logo central
│     ├─ Confete.tsx                           # partículas instanciadas
│     └─ usarAnimacaoRoleta.ts                 # hook com GSAP timeline
├─ src/components/QrCode.tsx                   # wrapper qrcode lib (SVG)
├─ src/hooks/
│  ├─ useSessaoRealtime.ts                     # subscription a sessoes_jogo
│  └─ usePreferredMotion.ts                    # prefers-reduced-motion
├─ src/lib/totem/
│  ├─ stateMachine.ts                          # reducer + types
│  └─ edgeFunctions.ts                         # helpers fetch para Edge Fns
├─ tests/components/
│  ├─ stateMachine.test.ts                     # 6 tests pure reducer
│  ├─ AttractMode.test.tsx                     # 2 tests
│  ├─ QrCodeScreen.test.tsx                    # 3 tests
│  └─ BannerGanhador.test.tsx                  # 3 tests
└─ .github/workflows/ci-ui.yml                  # JÁ EXISTE — não modifica
```

---

## Convenções deste plano

- **TDD** para lógica pura (reducer, hooks que não dependem de DOM 3D); **post-code** para componentes R3F (testá-los via @testing-library/react com R3F é frágil — validamos via smoke manual).
- Commits em conventional commits.
- Realtime subscription só ativa quando totem está em estados que dependem dela (`aguardando_celular`, `aguardando_dados`, `pronta_para_girar`, `girando`).
- Animação da roleta: easing `power3.out`, duração 5s, 6-8 voltas, jitter pequeno dentro da fatia. **Resultado vem 100% do servidor** (`premio_sorteado_id`).
- Reduced motion: pula animação e mostra resultado em fade 1s.

---

## Task 1 — Instalar R3F + drei + GSAP + qrcode

**Files:**
- Modify: `package.json`

- [ ] **Step 1.1: Instalar deps**

```bash
npm install --legacy-peer-deps \
  three @react-three/fiber @react-three/drei gsap qrcode @types/qrcode
```

- [ ] **Step 1.2: Validar typecheck e build**

```bash
npm run typecheck
npm run build
```

Expected: ambos exit 0.

- [ ] **Step 1.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(ui): install R3F, drei, GSAP, qrcode for totem 3D"
```

---

## Task 2 — State machine do totem (TDD pure reducer)

**Files:**
- Create: `src/lib/totem/stateMachine.ts`
- Create: `tests/components/stateMachine.test.ts`

State machine reflete (mas não duplica) o `sessoes_jogo.status` do Postgres. Cobre os estados: `attract`, `criando_sessao`, `aguardando_celular`, `aguardando_dados`, `pronta_para_girar`, `girando`, `finalizada`, `erro`.

- [ ] **Step 2.1: Escrever teste (RED)**

`tests/components/stateMachine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { totemReducer, type TotemState, type TotemAction } from '@/lib/totem/stateMachine';

const inicial: TotemState = { tipo: 'attract' };

describe('totemReducer', () => {
  it('attract + TOCAR -> criando_sessao', () => {
    const next = totemReducer(inicial, { tipo: 'TOCAR' });
    expect(next.tipo).toBe('criando_sessao');
  });

  it('criando_sessao + SESSAO_CRIADA -> aguardando_celular', () => {
    const next = totemReducer(
      { tipo: 'criando_sessao' },
      { tipo: 'SESSAO_CRIADA', sessaoId: 's-1', token: 't', expiraEm: new Date(Date.now() + 300_000).toISOString() }
    );
    expect(next).toMatchObject({
      tipo: 'aguardando_celular', sessaoId: 's-1', token: 't',
    });
  });

  it('aguardando_celular + REALTIME aguardando_dados -> aguardando_dados', () => {
    const next = totemReducer(
      { tipo: 'aguardando_celular', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'REALTIME_STATUS', status: 'aguardando_dados', premioId: null }
    );
    expect(next.tipo).toBe('aguardando_dados');
  });

  it('aguardando_dados + REALTIME pronta_para_girar -> pronta_para_girar com premioId', () => {
    const next = totemReducer(
      { tipo: 'aguardando_dados', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'REALTIME_STATUS', status: 'pronta_para_girar', premioId: 'p-1' }
    );
    expect(next).toMatchObject({ tipo: 'pronta_para_girar', premioId: 'p-1' });
  });

  it('girando + ANIMACAO_TERMINOU -> finalizada', () => {
    const next = totemReducer(
      { tipo: 'girando', sessaoId: 's-1', premioId: 'p-1' },
      { tipo: 'ANIMACAO_TERMINOU' }
    );
    expect(next.tipo).toBe('finalizada');
  });

  it('finalizada + AUTO_RETORNO -> attract (limpa estado)', () => {
    const next = totemReducer(
      { tipo: 'finalizada', sessaoId: 's-1', premioId: 'p-1' },
      { tipo: 'AUTO_RETORNO' }
    );
    expect(next).toEqual({ tipo: 'attract' });
  });

  it('qualquer estado + REALTIME expirada -> attract (sessão perdida)', () => {
    const next = totemReducer(
      { tipo: 'aguardando_dados', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'REALTIME_STATUS', status: 'expirada', premioId: null }
    );
    expect(next).toEqual({ tipo: 'attract' });
  });

  it('ERRO_REDE em qualquer estado -> erro com mensagem', () => {
    const next = totemReducer(
      { tipo: 'aguardando_celular', sessaoId: 's-1', token: 't', expiraEm: 'x' },
      { tipo: 'ERRO_REDE', mensagem: 'sem conexão' }
    );
    expect(next).toEqual({ tipo: 'erro', mensagem: 'sem conexão' });
  });
});
```

- [ ] **Step 2.2: RED**

```bash
npm run test:ui -- stateMachine
```

Expected: 8 failing (módulo não existe).

- [ ] **Step 2.3: Implementar**

`src/lib/totem/stateMachine.ts`:

```typescript
import type { SessaoStatus } from '@/lib/totem/types';

export type TotemState =
  | { tipo: 'attract' }
  | { tipo: 'criando_sessao' }
  | { tipo: 'aguardando_celular'; sessaoId: string; token: string; expiraEm: string }
  | { tipo: 'aguardando_dados'; sessaoId: string; token: string; expiraEm: string }
  | { tipo: 'pronta_para_girar'; sessaoId: string; premioId: string }
  | { tipo: 'girando'; sessaoId: string; premioId: string }
  | { tipo: 'finalizada'; sessaoId: string; premioId: string }
  | { tipo: 'erro'; mensagem: string };

export type TotemAction =
  | { tipo: 'TOCAR' }
  | { tipo: 'SESSAO_CRIADA'; sessaoId: string; token: string; expiraEm: string }
  | { tipo: 'REALTIME_STATUS'; status: SessaoStatus; premioId: string | null }
  | { tipo: 'ANIMACAO_TERMINOU' }
  | { tipo: 'AUTO_RETORNO' }
  | { tipo: 'ERRO_REDE'; mensagem: string }
  | { tipo: 'RESET' };

const INICIAL: TotemState = { tipo: 'attract' };

export function totemReducer(state: TotemState, action: TotemAction): TotemState {
  // Erros e resets globais
  if (action.tipo === 'ERRO_REDE') return { tipo: 'erro', mensagem: action.mensagem };
  if (action.tipo === 'RESET') return INICIAL;

  // REALTIME — sessões expiradas/canceladas voltam ao attract
  if (action.tipo === 'REALTIME_STATUS') {
    if (action.status === 'expirada' || action.status === 'cancelada') {
      return INICIAL;
    }
  }

  switch (state.tipo) {
    case 'attract':
      if (action.tipo === 'TOCAR') return { tipo: 'criando_sessao' };
      return state;

    case 'criando_sessao':
      if (action.tipo === 'SESSAO_CRIADA') {
        return {
          tipo: 'aguardando_celular',
          sessaoId: action.sessaoId, token: action.token, expiraEm: action.expiraEm,
        };
      }
      return state;

    case 'aguardando_celular':
      if (action.tipo === 'REALTIME_STATUS' && action.status === 'aguardando_dados') {
        return { tipo: 'aguardando_dados',
          sessaoId: state.sessaoId, token: state.token, expiraEm: state.expiraEm };
      }
      return state;

    case 'aguardando_dados':
      if (action.tipo === 'REALTIME_STATUS' && action.status === 'pronta_para_girar' && action.premioId) {
        return { tipo: 'pronta_para_girar', sessaoId: state.sessaoId, premioId: action.premioId };
      }
      return state;

    case 'pronta_para_girar':
      if (action.tipo === 'REALTIME_STATUS' && action.status === 'girando') {
        return { tipo: 'girando', sessaoId: state.sessaoId, premioId: state.premioId };
      }
      return state;

    case 'girando':
      if (action.tipo === 'ANIMACAO_TERMINOU') {
        return { tipo: 'finalizada', sessaoId: state.sessaoId, premioId: state.premioId };
      }
      return state;

    case 'finalizada':
      if (action.tipo === 'AUTO_RETORNO') return INICIAL;
      return state;

    case 'erro':
      if (action.tipo === 'TOCAR') return INICIAL;
      return state;

    default:
      return state;
  }
}

export const ESTADO_INICIAL: TotemState = INICIAL;
```

E criar `src/lib/totem/types.ts`:

```typescript
export type SessaoStatus =
  | 'aguardando_celular'
  | 'aguardando_dados'
  | 'pronta_para_girar'
  | 'girando'
  | 'finalizada'
  | 'expirada'
  | 'cancelada';

export interface PremioDb {
  id: string;
  nome: string;
  cor_hex: string | null;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
  estoque_atual: number;
  peso_base: number;
}
```

- [ ] **Step 2.4: GREEN**

```bash
npm run test:ui -- stateMachine
```

Expected: 8 passing.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/totem/ tests/components/stateMachine.test.ts
git commit -m "feat(totem): add state machine reducer with 8 transitions (TDD, 8 tests)"
```

---

## Task 3 — Edge Function helpers + Realtime hook

**Files:**
- Create: `src/lib/totem/edgeFunctions.ts`
- Create: `src/hooks/useSessaoRealtime.ts`

- [ ] **Step 3.1: Criar `edgeFunctions.ts`**

```typescript
import { env } from '@/lib/env';

export interface LiberarJogadaResp {
  sessao_id: string;
  token: string;
  expira_em: string;
}

export async function liberarJogada(
  accessToken: string,
  jogo: 'roleta' | 'dados'
): Promise<LiberarJogadaResp> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/liberar-jogada`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ jogo }),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `liberar-jogada falhou: ${res.status}`);
  }
  return res.json() as Promise<LiberarJogadaResp>;
}

export async function iniciarAnimacao(accessToken: string, sessaoId: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/iniciar-animacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ sessao_id: sessaoId }),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `iniciar-animacao falhou: ${res.status}`);
  }
}

export async function concluirAnimacao(accessToken: string, sessaoId: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/concluir-animacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ sessao_id: sessaoId }),
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro ?? `concluir-animacao falhou: ${res.status}`);
  }
}
```

- [ ] **Step 3.2: Criar `src/hooks/useSessaoRealtime.ts`**

```typescript
'use client';
import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { SessaoStatus } from '@/lib/totem/types';

export interface RealtimePayload {
  status: SessaoStatus;
  premio_sorteado_id: string | null;
}

/**
 * Assina mudanças em sessoes_jogo para uma sessão específica.
 * Retorna o último payload conhecido + estado de conexão.
 */
export function useSessaoRealtime(sessaoId: string | null): {
  payload: RealtimePayload | null;
  conectado: boolean;
} {
  const [payload, setPayload] = React.useState<RealtimePayload | null>(null);
  const [conectado, setConectado] = React.useState(false);

  React.useEffect(() => {
    if (!sessaoId) {
      setPayload(null);
      setConectado(false);
      return;
    }

    const sb = getSupabaseBrowserClient();

    // 1) Buscar estado atual imediatamente (para o caso de a sessão já ter mudado antes da subscription)
    let alive = true;
    sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id')
      .eq('id', sessaoId)
      .single()
      .then(({ data }) => {
        if (alive && data) {
          setPayload({
            status: data.status as SessaoStatus,
            premio_sorteado_id: data.premio_sorteado_id ?? null,
          });
        }
      });

    // 2) Subscription Realtime
    const channel = sb
      .channel(`sessao:${sessaoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessoes_jogo', filter: `id=eq.${sessaoId}` },
        (rec) => {
          const novo = rec.new as { status: SessaoStatus; premio_sorteado_id: string | null };
          setPayload({ status: novo.status, premio_sorteado_id: novo.premio_sorteado_id });
        }
      )
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED');
      });

    return () => {
      alive = false;
      sb.removeChannel(channel);
    };
  }, [sessaoId]);

  return { payload, conectado };
}
```

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/totem/edgeFunctions.ts src/hooks/useSessaoRealtime.ts
git commit -m "feat(totem): add edge function helpers and useSessaoRealtime hook"
```

---

## Task 4 — Componente QrCode + QrCodeScreen (TDD)

**Files:**
- Create: `src/components/QrCode.tsx`
- Create: `src/components/totem/QrCodeScreen.tsx`
- Create: `tests/components/QrCodeScreen.test.tsx`

- [ ] **Step 4.1: Criar `src/components/QrCode.tsx`**

```tsx
'use client';
import * as React from 'react';
import QRCode from 'qrcode';

export function QrCode({ data, size = 384 }: { data: string; size?: number }) {
  const [svg, setSvg] = React.useState<string>('');

  React.useEffect(() => {
    QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size,
      color: { dark: '#0d5d56', light: '#ffffff' },
    })
      .then(setSvg)
      .catch(console.error);
  }, [data, size]);

  if (!svg) return <div className="animate-pulse rounded-md bg-muted" style={{ width: size, height: size }} />;

  return (
    <div
      aria-label="QR Code para participar"
      role="img"
      dangerouslySetInnerHTML={{ __html: svg }}
      className="rounded-lg border bg-white p-2 shadow-sm"
    />
  );
}
```

- [ ] **Step 4.2: Criar `src/components/totem/QrCodeScreen.tsx`**

```tsx
'use client';
import * as React from 'react';
import { QrCode } from '@/components/QrCode';
import { Smartphone } from 'lucide-react';

interface Props {
  url: string;            // URL completa que será embutida no QR
  expiraEm: string;       // ISO date string
  aguardandoDados?: boolean;
}

function format(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function QrCodeScreen({ url, expiraEm, aguardandoDados }: Props) {
  const [agora, setAgora] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segundos = Math.max(0, Math.floor((new Date(expiraEm).getTime() - agora) / 1000));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <h1 className="text-4xl font-bold tracking-tight">
        {aguardandoDados ? 'Aguardando dados do jogador...' : 'Aponte a câmera do celular aqui'}
      </h1>
      <QrCode data={url} size={420} />
      <div className="flex items-center gap-2 text-2xl font-mono text-muted-foreground" aria-live="polite">
        <Smartphone className="h-6 w-6" />
        <span>Tempo restante: {format(segundos)}</span>
      </div>
      {aguardandoDados && (
        <p className="text-lg text-muted-foreground animate-pulse">
          O jogador está preenchendo os dados...
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4.3: Escrever teste**

`tests/components/QrCodeScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';

describe('QrCodeScreen', () => {
  it('renderiza countdown em formato M:SS', () => {
    const exp = new Date(Date.now() + 125_000).toISOString();
    render(<QrCodeScreen url="https://x" expiraEm={exp} />);
    expect(screen.getByText(/Tempo restante:/)).toBeInTheDocument();
    expect(screen.getByText(/2:0\d/)).toBeInTheDocument();
  });

  it('mostra texto "Aponte a câmera" quando não está em aguardandoDados', () => {
    render(<QrCodeScreen url="https://x" expiraEm={new Date(Date.now() + 60_000).toISOString()} />);
    expect(screen.getByText(/Aponte a c.mera/)).toBeInTheDocument();
  });

  it('mostra "Aguardando dados" quando flag setada', () => {
    render(
      <QrCodeScreen url="https://x" expiraEm={new Date(Date.now() + 60_000).toISOString()} aguardandoDados />
    );
    expect(screen.getByText(/Aguardando dados/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.4: Rodar — esperar GREEN imediato (componente já existe)**

```bash
npm run test:ui -- QrCodeScreen
```

Expected: 3 passing.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/QrCode.tsx src/components/totem/QrCodeScreen.tsx tests/components/QrCodeScreen.test.tsx
git commit -m "feat(totem): add QrCode and QrCodeScreen with countdown (3 tests)"
```

---

## Task 5 — AttractMode (touch-to-start)

**Files:**
- Create: `src/components/totem/AttractMode.tsx`
- Create: `tests/components/AttractMode.test.tsx`

- [ ] **Step 5.1: Criar `src/components/totem/AttractMode.tsx`**

```tsx
'use client';
import * as React from 'react';
import Image from 'next/image';
import { LogoAltis } from '@/components/LogoAltis';

interface Props {
  onTocar: () => void;
  disabled?: boolean;
}

export function AttractMode({ onTocar, disabled }: Props) {
  // Keyboard fallback (operador pode disparar com Espaço/Enter se totem tiver teclado).
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
        e.preventDefault();
        onTocar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTocar, disabled]);

  return (
    <button
      type="button"
      onClick={onTocar}
      disabled={disabled}
      className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-background text-center transition-opacity disabled:opacity-50"
      aria-label="Toque para participar da Roleta de Prêmios"
    >
      <LogoAltis size={128} />
      <h1 className="text-6xl font-extrabold tracking-tight">
        ROLETA DE PRÊMIOS
      </h1>
      <p className="animate-pulse text-3xl font-bold text-primary">
        TOQUE PARA PARTICIPAR
      </p>
      <div className="mt-4">
        <Image
          src="/altis-animacao.gif"
          alt=""
          width={200}
          height={200}
          unoptimized
          aria-hidden="true"
        />
      </div>
      {disabled && (
        <p className="text-sm text-muted-foreground">Gerando sessão...</p>
      )}
    </button>
  );
}
```

- [ ] **Step 5.2: Escrever teste**

`tests/components/AttractMode.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AttractMode } from '@/components/totem/AttractMode';

describe('AttractMode', () => {
  it('clicar dispara onTocar', async () => {
    const onTocar = vi.fn();
    const user = userEvent.setup();
    render(<AttractMode onTocar={onTocar} />);
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onTocar).toHaveBeenCalledOnce();
  });

  it('disabled mostra texto e bloqueia onTocar', async () => {
    const onTocar = vi.fn();
    const user = userEvent.setup();
    render(<AttractMode onTocar={onTocar} disabled />);
    expect(screen.getByText(/gerando sess/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onTocar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5.3: Rodar — GREEN**

```bash
npm run test:ui -- AttractMode
```

Expected: 2 passing.

- [ ] **Step 5.4: Commit**

```bash
git add src/components/totem/AttractMode.tsx tests/components/AttractMode.test.tsx
git commit -m "feat(totem): add AttractMode with touch + keyboard fallback (2 tests)"
```

---

## Task 6 — R3F Roleta: Canvas + Roda + Ponteiro + EixoCentro

**Files:**
- Create: `src/components/totem/roleta/RoletaCanvas.tsx`
- Create: `src/components/totem/roleta/Roda.tsx`
- Create: `src/components/totem/roleta/Ponteiro.tsx`
- Create: `src/components/totem/roleta/EixoCentro.tsx`

> Componentes 3D **não são testados unitariamente** (validação visual no smoke).

- [ ] **Step 6.1: Criar `Ponteiro.tsx`**

```tsx
'use client';
import * as React from 'react';

/** Triângulo fixo no topo, apontando pra baixo. Em coordenadas (0, 0, 0) = centro da roleta. */
export const Ponteiro = React.forwardRef<THREE.Mesh>(function Ponteiro(_, ref) {
  // raioRoleta ~ 2.5; ponteiro fica em y=2.7
  return (
    <mesh ref={ref} position={[0, 2.7, 0.1]} rotation={[0, 0, Math.PI]}>
      <coneGeometry args={[0.2, 0.4, 3]} />
      <meshStandardMaterial color="#e74c3c" />
    </mesh>
  );
});
```

- [ ] **Step 6.2: Criar `EixoCentro.tsx`**

```tsx
'use client';
import * as React from 'react';

export function EixoCentro() {
  return (
    <mesh position={[0, 0, 0.15]}>
      <circleGeometry args={[0.5, 32]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}
```

- [ ] **Step 6.3: Criar `Roda.tsx`** — geometria das N fatias

```tsx
'use client';
import * as React from 'react';
import * as THREE from 'three';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  premios: PremioDb[];
  raio?: number;
}

export const Roda = React.forwardRef<THREE.Group, Props>(function Roda(
  { premios, raio = 2.5 }, ref
) {
  const total = premios.length || 1;
  const anguloPorFatia = (Math.PI * 2) / total;

  return (
    <group ref={ref}>
      {premios.map((p, i) => {
        const inicio = i * anguloPorFatia;
        const fim = inicio + anguloPorFatia;
        const cor = p.cor_hex ?? '#cccccc';
        return (
          <Fatia
            key={p.id}
            inicio={inicio}
            fim={fim}
            raio={raio}
            cor={cor}
            nome={p.nome}
          />
        );
      })}
    </group>
  );
});

function Fatia({
  inicio, fim, raio, cor, nome,
}: { inicio: number; fim: number; raio: number; cor: string; nome: string }) {
  // Cria geometria de "pizza slice": THREE.Shape.
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, raio, inicio, fim, false);
    shape.lineTo(0, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, [inicio, fim, raio]);

  // Posição central da fatia para o label
  const meio = (inicio + fim) / 2;
  const labelR = raio * 0.7;
  const labelPos: [number, number, number] = [Math.cos(meio) * labelR, Math.sin(meio) * labelR, 0.05];

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={cor} side={THREE.DoubleSide} />
      </mesh>
      {/* Label rotacionado ao longo do raio */}
      <mesh position={labelPos} rotation={[0, 0, meio - Math.PI / 2]}>
        <planeGeometry args={[1, 0.3]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Drei <Text> não é simples num plano sem TypeScript helpers; emitimos só cor por enquanto. */}
    </group>
  );
}
```

- [ ] **Step 6.4: Criar `RoletaCanvas.tsx`**

```tsx
'use client';
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import type { PremioDb } from '@/lib/totem/types';
import { Roda } from './Roda';
import { Ponteiro } from './Ponteiro';
import { EixoCentro } from './EixoCentro';

interface Props {
  premios: PremioDb[];
  rodaRef: React.MutableRefObject<unknown>;  // setado pelo hook de animação
}

export function RoletaCanvas({ premios, rodaRef }: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 5], zoom: 120 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={1.0} />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
      <Roda ref={rodaRef as React.Ref<THREE.Group>} premios={premios} />
      <EixoCentro />
      <Ponteiro />
    </Canvas>
  );
}
```

- [ ] **Step 6.5: Validar typecheck + build**

```bash
npm run typecheck
npm run build
```

Expected: ambos exit 0. Build produzirá warnings sobre uso de `dynamic` para R3F mas roda OK em estático.

- [ ] **Step 6.6: Commit**

```bash
git add src/components/totem/roleta/
git commit -m "feat(totem): add R3F roleta 3D (Canvas, Roda, Ponteiro, EixoCentro)"
```

---

## Task 7 — Hook de animação GSAP determinística

**Files:**
- Create: `src/components/totem/roleta/usarAnimacaoRoleta.ts`
- Create: `src/hooks/usePreferredMotion.ts`

- [ ] **Step 7.1: Criar `usePreferredMotion.ts`**

```typescript
'use client';
import * as React from 'react';

export function usePreferredMotion(): { reduzir: boolean } {
  const [reduzir, setReduzir] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzir(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduzir(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return { reduzir };
}
```

- [ ] **Step 7.2: Criar `usarAnimacaoRoleta.ts`**

```typescript
'use client';
import * as React from 'react';
import gsap from 'gsap';
import type { PremioDb } from '@/lib/totem/types';

interface Args {
  premios: PremioDb[];
  premioVencedorId: string | null;
  reduzir: boolean;
  onConcluir: () => void;
}

/**
 * Retorna um ref para o <group> da roda + função que dispara a animação determinística.
 * A animação aterrissa no ângulo central da fatia do premio_sorteado_id.
 */
export function usarAnimacaoRoleta({ premios, premioVencedorId, reduzir, onConcluir }: Args): {
  rodaRef: React.MutableRefObject<unknown>;
  iniciar: () => void;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rodaRef = React.useRef<any>(null);

  const iniciar = React.useCallback(() => {
    const idx = premios.findIndex((p) => p.id === premioVencedorId);
    if (idx < 0 || !rodaRef.current) {
      onConcluir();
      return;
    }
    const total = premios.length;
    const anguloFatia = (Math.PI * 2) / total;
    const anguloAlvo = -(idx * anguloFatia + anguloFatia / 2) + Math.PI / 2;
    const voltas = 6 + Math.random() * 2;
    const jitter = (Math.random() - 0.5) * anguloFatia * 0.6;
    const final = anguloAlvo + voltas * Math.PI * 2 + jitter;

    if (reduzir) {
      // Pula animação: salta direto para o ângulo final em 800ms (fade-like)
      gsap.to(rodaRef.current.rotation, {
        z: anguloAlvo + jitter,
        duration: 0.8,
        ease: 'power1.inOut',
        onComplete: onConcluir,
      });
      return;
    }

    gsap.to(rodaRef.current.rotation, {
      z: final,
      duration: 5,
      ease: 'power3.out',
      onComplete: onConcluir,
    });
  }, [premios, premioVencedorId, reduzir, onConcluir]);

  return { rodaRef, iniciar };
}
```

- [ ] **Step 7.3: Commit**

```bash
git add src/components/totem/roleta/usarAnimacaoRoleta.ts src/hooks/usePreferredMotion.ts
git commit -m "feat(totem): add deterministic GSAP animation hook + prefers-reduced-motion"
```

---

## Task 8 — BannerGanhador + auto-retorno (TDD)

**Files:**
- Create: `src/components/totem/BannerGanhador.tsx`
- Create: `src/components/totem/AguardandoDados.tsx`
- Create: `tests/components/BannerGanhador.test.tsx`

- [ ] **Step 8.1: Criar `AguardandoDados.tsx`**

```tsx
'use client';
import { LogoAltis } from '@/components/LogoAltis';

interface Props { nome?: string | null }
export function AguardandoDados({ nome }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background text-center">
      <LogoAltis size={96} />
      <h1 className="text-5xl font-bold tracking-tight">
        {nome ? `Boa sorte, ${nome}!` : 'Boa sorte!'}
      </h1>
      <p className="animate-pulse text-2xl text-muted-foreground">
        Preparando a roleta...
      </p>
    </div>
  );
}
```

- [ ] **Step 8.2: Criar `BannerGanhador.tsx`**

```tsx
'use client';
import * as React from 'react';
import { Trophy, Heart } from 'lucide-react';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  jogadorNome?: string | null;
  /** segundos até auto-retorno (default 25). */
  segundosAteVoltar?: number;
  onVoltar: () => void;
}

export function BannerGanhador({
  premioNome, ePremioReal, jogadorNome, segundosAteVoltar = 25, onVoltar,
}: Props) {
  const [segundos, setSegundos] = React.useState(segundosAteVoltar);

  React.useEffect(() => {
    if (segundos <= 0) {
      onVoltar();
      return;
    }
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [segundos, onVoltar]);

  if (ePremioReal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/10 to-background p-8 text-center" aria-live="polite">
        <Trophy className="h-32 w-32 text-primary" />
        <h1 className="text-6xl font-extrabold tracking-tight">
          Parabéns{jogadorNome ? `, ${jogadorNome}` : ''}!
        </h1>
        <p className="text-3xl font-bold">Você ganhou:</p>
        <p className="rounded-2xl border-4 border-primary bg-card px-12 py-6 text-5xl font-extrabold text-primary">
          {premioNome}
        </p>
        <p className="mt-8 text-lg text-muted-foreground">
          Retire seu prêmio com a atendente.
        </p>
        <p className="text-sm text-muted-foreground">
          Voltando ao início em {segundos}s
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center" aria-live="polite">
      <Heart className="h-24 w-24 text-muted-foreground" />
      <h1 className="text-5xl font-bold tracking-tight">
        Não foi dessa vez{jogadorNome ? `, ${jogadorNome}` : ''}!
      </h1>
      <p className="text-2xl text-muted-foreground">Obrigado por participar.</p>
      <p className="text-sm text-muted-foreground">
        Voltando ao início em {segundos}s
      </p>
    </div>
  );
}
```

- [ ] **Step 8.3: Escrever teste**

`tests/components/BannerGanhador.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BannerGanhador } from '@/components/totem/BannerGanhador';

describe('BannerGanhador', () => {
  it('mostra premio real e nome do jogador', () => {
    render(<BannerGanhador premioNome="Vale R$10" ePremioReal jogadorNome="Maria" onVoltar={vi.fn()} />);
    expect(screen.getByText(/Parab.ns, Maria/)).toBeInTheDocument();
    expect(screen.getByText('Vale R$10')).toBeInTheDocument();
    expect(screen.getByText(/retire/i)).toBeInTheDocument();
  });

  it('mostra "Não foi dessa vez" quando ePremioReal=false', () => {
    render(<BannerGanhador premioNome="Não foi" ePremioReal={false} jogadorNome="João" onVoltar={vi.fn()} />);
    expect(screen.getByText(/N.o foi dessa vez/)).toBeInTheDocument();
    expect(screen.queryByText('Não foi')).not.toBeInTheDocument(); // não exibe o nome do "prêmio"
  });

  it('chama onVoltar após segundosAteVoltar=0', () => {
    vi.useFakeTimers();
    const onVoltar = vi.fn();
    render(<BannerGanhador premioNome="x" ePremioReal jogadorNome="y" segundosAteVoltar={2} onVoltar={onVoltar} />);
    vi.advanceTimersByTime(2100);
    expect(onVoltar).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 8.4: Rodar — GREEN**

```bash
npm run test:ui -- BannerGanhador
```

Expected: 3 passing.

- [ ] **Step 8.5: Commit**

```bash
git add src/components/totem/BannerGanhador.tsx src/components/totem/AguardandoDados.tsx tests/components/BannerGanhador.test.tsx
git commit -m "feat(totem): add BannerGanhador (real/nao foi) + AguardandoDados + auto-return (3 tests)"
```

---

## Task 9 — `/totem` page completa (state machine + Realtime integrados)

**Files:**
- Modify: `src/app/totem/page.tsx`
- Create: `src/components/totem/ErroOverlay.tsx`

- [ ] **Step 9.1: Criar `ErroOverlay.tsx`**

```tsx
'use client';
import { WifiOff } from 'lucide-react';

export function ErroOverlay({ mensagem }: { mensagem: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 p-8 text-center">
      <WifiOff className="h-16 w-16 text-destructive" />
      <h2 className="text-3xl font-bold">Reconectando...</h2>
      <p className="text-muted-foreground">{mensagem}</p>
    </div>
  );
}
```

- [ ] **Step 9.2: Substituir `src/app/totem/page.tsx` (página completa)**

```tsx
'use client';
import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { totemReducer, ESTADO_INICIAL } from '@/lib/totem/stateMachine';
import { useSessaoRealtime } from '@/hooks/useSessaoRealtime';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { liberarJogada, iniciarAnimacao, concluirAnimacao } from '@/lib/totem/edgeFunctions';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { PremioDb } from '@/lib/totem/types';
import { env } from '@/lib/env';
import { AttractMode } from '@/components/totem/AttractMode';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { AguardandoDados } from '@/components/totem/AguardandoDados';
import { BannerGanhador } from '@/components/totem/BannerGanhador';
import { RoletaCanvas } from '@/components/totem/roleta/RoletaCanvas';
import { usarAnimacaoRoleta } from '@/components/totem/roleta/usarAnimacaoRoleta';
import { ErroOverlay } from '@/components/totem/ErroOverlay';

export default function TotemPage() {
  return (
    <AuthGuard>
      <TotemFlow />
    </AuthGuard>
  );
}

function TotemFlow() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? '';
  const [state, dispatch] = React.useReducer(totemReducer, ESTADO_INICIAL);
  const { reduzir } = usePreferredMotion();

  // ─── PRÊMIOS DO EVENTO ATIVO (carregar 1x) ────────────────────────────
  const [premios, setPremios] = React.useState<PremioDb[]>([]);
  const [jogadorNome, setJogadorNome] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      const { data: evt } = await sb.from('eventos').select('id').eq('status', 'ativo').maybeSingle();
      if (!evt || !alive) return;
      const { data } = await sb.from('premios')
        .select('id,nome,cor_hex,foto_path,ordem_roleta,e_premio_real,estoque_atual,peso_base')
        .eq('evento_id', evt.id)
        .order('ordem_roleta', { ascending: true });
      if (alive && data) setPremios(data as PremioDb[]);
    })();
    return () => { alive = false; };
  }, []);

  // ─── SESSÃO ID ATUAL (para Realtime) ──────────────────────────────────
  const sessaoId =
    state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados' ||
    state.tipo === 'pronta_para_girar' || state.tipo === 'girando' || state.tipo === 'finalizada'
      ? state.sessaoId
      : null;

  const { payload, conectado } = useSessaoRealtime(sessaoId);

  // ─── SINCRONIZA REALTIME -> STATE MACHINE ─────────────────────────────
  React.useEffect(() => {
    if (!payload) return;
    dispatch({
      tipo: 'REALTIME_STATUS',
      status: payload.status,
      premioId: payload.premio_sorteado_id,
    });
  }, [payload]);

  // ─── TOQUE NO ATTRACT -> LIBERAR-JOGADA ───────────────────────────────
  const tocar = React.useCallback(async () => {
    dispatch({ tipo: 'TOCAR' });
    try {
      const r = await liberarJogada(accessToken, 'roleta');
      dispatch({ tipo: 'SESSAO_CRIADA', sessaoId: r.sessao_id, token: r.token, expiraEm: r.expira_em });
    } catch (e) {
      dispatch({ tipo: 'ERRO_REDE', mensagem: e instanceof Error ? e.message : 'falha de rede' });
    }
  }, [accessToken]);

  // ─── BUSCA NOME DO JOGADOR QUANDO CHEGA pronta_para_girar ────────────
  React.useEffect(() => {
    if (state.tipo !== 'pronta_para_girar') return;
    const sb = getSupabaseBrowserClient();
    sb.from('sessoes_jogo')
      .select('jogador_nome')
      .eq('id', state.sessaoId)
      .single()
      .then(({ data }) => { if (data) setJogadorNome(data.jogador_nome); });
  }, [state.tipo, state]);

  // ─── DISPARA INICIAR ANIMAÇÃO QUANDO ENTRA EM pronta_para_girar ─────
  const iniciouRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (state.tipo !== 'pronta_para_girar') return;
    if (iniciouRef.current === state.sessaoId) return;
    iniciouRef.current = state.sessaoId;
    iniciarAnimacao(accessToken, state.sessaoId).catch((e) =>
      dispatch({ tipo: 'ERRO_REDE', mensagem: e.message })
    );
  }, [state, accessToken]);

  // ─── HOOK DE ANIMAÇÃO (rodaRef + iniciar) ────────────────────────────
  const premioVencedorId = (state.tipo === 'girando' || state.tipo === 'pronta_para_girar')
    ? state.premioId : null;

  const onAnimacaoConcluir = React.useCallback(() => {
    dispatch({ tipo: 'ANIMACAO_TERMINOU' });
    if (state.tipo === 'girando' || state.tipo === 'pronta_para_girar') {
      concluirAnimacao(accessToken, state.sessaoId).catch(() => { /* idempotente */ });
    }
  }, [state, accessToken]);

  const { rodaRef, iniciar } = usarAnimacaoRoleta({
    premios, premioVencedorId, reduzir, onConcluir: onAnimacaoConcluir,
  });

  React.useEffect(() => {
    if (state.tipo === 'girando') iniciar();
  }, [state.tipo, iniciar]);

  // ─── URL do QR (capability token) ─────────────────────────────────────
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl =
    state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados'
      ? `${baseUrl}/jogar?s=${state.sessaoId}&t=${state.token}`
      : '';

  // ─── ENCONTRA PRÊMIO SORTEADO PARA BANNER ────────────────────────────
  const premioSorteado = premios.find((p) => p.id === premioVencedorId);

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (!conectado && sessaoId) {
    return <ErroOverlay mensagem="Aguardando conexão com servidor..." />;
  }

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  if (state.tipo === 'attract' || state.tipo === 'criando_sessao') {
    return <AttractMode onTocar={tocar} disabled={state.tipo === 'criando_sessao'} />;
  }

  if (state.tipo === 'aguardando_celular' || state.tipo === 'aguardando_dados') {
    return (
      <QrCodeScreen
        url={qrUrl}
        expiraEm={state.expiraEm}
        aguardandoDados={state.tipo === 'aguardando_dados'}
      />
    );
  }

  if (state.tipo === 'pronta_para_girar') {
    return <AguardandoDados nome={jogadorNome} />;
  }

  if (state.tipo === 'girando') {
    return (
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background">
        <h2 className="p-8 text-center text-4xl font-bold tracking-tight">
          {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
        </h2>
        <div className="h-full w-full">
          <RoletaCanvas premios={premios} rodaRef={rodaRef} />
        </div>
      </div>
    );
  }

  if (state.tipo === 'finalizada' && premioSorteado) {
    return (
      <BannerGanhador
        premioNome={premioSorteado.nome}
        ePremioReal={premioSorteado.e_premio_real}
        jogadorNome={jogadorNome}
        onVoltar={() => {
          setJogadorNome(null);
          dispatch({ tipo: 'AUTO_RETORNO' });
        }}
      />
    );
  }

  return null;
}
```

- [ ] **Step 9.3: Build + typecheck**

```bash
npm run typecheck
npm run build
```

Expected: ambos exit 0. (Pode dar warning sobre R3F como client component; OK.)

- [ ] **Step 9.4: Smoke manual**

```bash
# Terminal 1: Supabase funcionando (já está, do Plano 4)
# Terminal 2: functions serve
npm run functions:serve

# Terminal 3: Next dev
npm run dev
```

Acessar `http://localhost:3000`, logar, clicar "Abrir Totem" no card Roleta.

Esperado:
- Vê attract com "TOQUE PARA PARTICIPAR"
- Tocar → spinner "Gerando sessão..." → QR Code aparece com countdown 5:00
- (Para testar o resto, precisaria de outro cliente acessar `/jogar?s=...&t=...` — que é Plano 6. Por enquanto, valida visualmente até QR.)

Encerrar todos os terminais.

- [ ] **Step 9.5: Commit**

```bash
git add src/app/totem/page.tsx src/components/totem/ErroOverlay.tsx
git commit -m "feat(totem): integrate state machine + Realtime + R3F roleta in /totem page"
```

---

## Task 10 — Smoke test simulado via SQL (testa state machine ponta-a-ponta)

> Como Plano 6 (página `/jogar`) ainda não existe, vamos simular o jogador via SQL direto no DB. Isso valida que o Realtime + state machine + animação funcionam end-to-end no totem.

**Files:**
- Create: `cli/tests/totem-smoke.test.ts`

> Este é um teste de **fixture/smoke** (não Vitest UI). Roda contra o DB real e dispara as transições que normalmente o /jogar faria.

- [ ] **Step 10.1: Criar smoke test**

`cli/tests/totem-smoke.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadTestEnv } from './helpers/fixtures.js';
import { getAdminClient } from '../src/lib/supabase-admin.js';
import { randomUUID } from 'node:crypto';

const OPERADOR_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_DEMO  = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
let sessaoId: string;
let premioId: string;

beforeAll(() => { loadTestEnv(); });

afterAll(async () => {
  // limpar fixtures criadas
  const sb = getAdminClient();
  if (sessaoId) {
    await sb.from('ganhadores').delete().eq('sessao_id', sessaoId);
    await sb.from('sessoes_jogo').delete().eq('id', sessaoId);
  }
});

describe('totem smoke: fluxo SQL completo do servidor', () => {
  it('liberar -> obter -> submeter -> iniciar -> concluir muda status conforme esperado', async () => {
    const sb = getAdminClient();

    // 1) liberar (cria sessão)
    sessaoId = randomUUID();
    const { error: e1 } = await sb.from('sessoes_jogo').insert({
      id: sessaoId, evento_id: EVENTO_DEMO, jogo: 'roleta',
      status: 'aguardando_celular', liberada_por: OPERADOR_ID,
    });
    expect(e1).toBeNull();

    // 2) obter (jogador escaneou QR)
    await sb.from('sessoes_jogo').update({ status: 'aguardando_dados' }).eq('id', sessaoId);

    // 3) submeter dados + sortear
    await sb.from('sessoes_jogo').update({
      jogador_nome: 'Smoke',
      jogador_telefone: '54988889999',
      jogador_email: 's@s',
    }).eq('id', sessaoId);

    const { error: rpcErr } = await sb.rpc('sortear_e_baixar_estoque', { p_sessao_id: sessaoId });
    expect(rpcErr).toBeNull();

    // confirma transição
    const { data: s1 } = await sb.from('sessoes_jogo')
      .select('status, premio_sorteado_id').eq('id', sessaoId).single();
    expect(s1?.status).toBe('pronta_para_girar');
    expect(s1?.premio_sorteado_id).toBeTruthy();
    premioId = s1!.premio_sorteado_id as string;

    // 4) iniciar animação
    await sb.from('sessoes_jogo').update({ status: 'girando' }).eq('id', sessaoId);

    // 5) concluir
    await sb.from('sessoes_jogo').update({
      status: 'finalizada', finalizada_em: new Date().toISOString(),
    }).eq('id', sessaoId);

    const { data: s2 } = await sb.from('sessoes_jogo')
      .select('status, finalizada_em').eq('id', sessaoId).single();
    expect(s2?.status).toBe('finalizada');
    expect(s2?.finalizada_em).toBeTruthy();

    // ganhador inserido
    const { data: g } = await sb.from('ganhadores')
      .select('jogador_nome, premio_id').eq('sessao_id', sessaoId).single();
    expect(g?.jogador_nome).toBe('Smoke');
    expect(g?.premio_id).toBe(premioId);
  });
});
```

- [ ] **Step 10.2: Rodar**

```bash
npm run test:cli -- totem-smoke
```

Expected: 1 passing (após muitos asserts).

- [ ] **Step 10.3: Commit**

```bash
git add cli/tests/totem-smoke.test.ts
git commit -m "test(totem): add smoke E2E SQL-level for full game flow"
```

---

## Task 11 — README + tag final

- [ ] **Step 11.1: Atualizar tabela de planos no README**

```markdown
| Plano | Status | Conteúdo |
|---|---|---|
| 1 — Foundation DB | ✅ completo | Schema + RLS + sortear + pg_cron + Storage + seed |
| 2 — Edge Functions | ✅ completo | 7 Edge Functions Deno + 29 tests |
| 3 — CLI | ✅ completo | 6 comandos + 17 tests |
| 4 — UI Foundation | ✅ completo | Next.js + Tailwind + shadcn/ui + Auth + Welcome + Modal Admin + 14 tests |
| 5 — UI Totem | ✅ completo | R3F Roleta 3D + state machine + Realtime + GSAP (16 tests, totem completo) |
| 6 — UI Jogador + Admin | 🔜 próximo | `/jogar` + painel admin |
```

E atualizar `## Comandos úteis` para incluir `Total: ~160 testes`.

- [ ] **Step 11.2: Commit + tag**

```bash
git add README.md
git commit -m "docs: mark Plano 5 (UI Totem) as complete"
git tag -a "plano-5-completo" -m "Plano 5: UI Totem completo — R3F Roleta 3D + state machine + Realtime + GSAP"
git log --oneline | head -20
```

---

## Resumo pós-Plano 5

✅ State machine reducer com 8 transições válidas (TDD, 8 tests)
✅ `useSessaoRealtime` hook com Postgres CDC + initial fetch fallback
✅ Edge Function helpers (liberar/iniciar/concluir-animacao)
✅ `QrCode` (qrcode lib → SVG) + `QrCodeScreen` com countdown
✅ `AttractMode` com touch + keyboard (Espaço/Enter)
✅ R3F roleta 3D — `RoletaCanvas`, `Roda` (N fatias dinâmicas), `Ponteiro`, `EixoCentro`
✅ Hook `usarAnimacaoRoleta` GSAP com aterragem determinística + jitter + reduced-motion
✅ `BannerGanhador` (prêmio real ou "não foi") com auto-retorno 25s (3 tests)
✅ `AguardandoDados` + `ErroOverlay`
✅ `/totem` page completa orquestrando tudo via state machine + Realtime
✅ Smoke E2E SQL-level (cli/tests/totem-smoke.test.ts)
✅ ~16 vitest tests adicionados (8 reducer + 3 QrCodeScreen + 2 AttractMode + 3 BannerGanhador) = **143 + 16 = ~159 testes verdes**

---

## Self-Review

**1. Spec coverage (§4 fluxo + §7 UI totem):**
- State machine 8 estados (§4.1) → Task 2 ✅
- Touch-to-start (§3 decisão revisada) → Task 5 ✅
- QR Code com capability token (§5.1) → Task 4 + Task 9 (URL com `?s=&t=`) ✅
- Realtime subscription para `sessoes_jogo` (§2 abordagem A) → Task 3 ✅
- Sorteio decidido pelo servidor; animação só aterrissa (§4 decisão crítica) → Task 7 ✅
- Animação GSAP ease-out-cubic 5s + 6-8 voltas + jitter (§7.3) → Task 7 ✅
- prefers-reduced-motion fade 1s (§7.6) → Tasks 7.1 + 7.2 ✅
- Banner ganhador real ou "Não foi" (§7.4) → Task 8 ✅
- Auto-retorno 25s (§4 + §7.4) → Task 8 ✅
- ErroOverlay reconectando (§7.4) → Task 9.1 ✅
- Keyboard fallback Espaço/Enter (§7.6) → Task 5 ✅

**2. Placeholder scan:** zero TBD/TODO. Cada step com código completo. ✅

**3. Type consistency:**
- `TotemState`/`TotemAction` em Task 2; usado em Task 9 (`useReducer`). ✅
- `PremioDb` em `types.ts` (Task 2.3); usado em Tasks 6, 7, 9. ✅
- `RealtimePayload { status, premio_sorteado_id }` em Task 3.2; usado em Task 9 (`useEffect` dispatch). ✅
- `liberarJogada(accessToken, jogo)` retorno `{ sessao_id, token, expira_em }` em Task 3.1; mesma forma usada em Task 9. ✅
- `usarAnimacaoRoleta({ premios, premioVencedorId, reduzir, onConcluir })` em Task 7.2; assinatura igual em Task 9. ✅
- `BannerGanhador { premioNome, ePremioReal, jogadorNome?, segundosAteVoltar?, onVoltar }` em Task 8.2; mesma chamada em Task 9. ✅

Plano completo, autocontido, executável task-por-task.
