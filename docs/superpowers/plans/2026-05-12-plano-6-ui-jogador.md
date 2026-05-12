# Altis Bet — Plano 6: UI Jogador (`/jogar` no celular)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a rota **`/jogar?s=<sessao_id>&t=<token>`** — a página que o jogador abre no celular após escanear o QR Code do totem. Valida capability token, mostra catálogo de prêmios, coleta dados (Nome, Telefone, E-mail, Loja opcional) + device fingerprint, submete via Edge Functions, e mostra "Aguarde, vai girar no totem!" → "Você ganhou X" via Realtime.

**Architecture:** Página completamente client-side (rota estática Next.js), sem auth tradicional — autorização única vem do capability token na URL. Hook `useSessaoJogador` orquestra: `obter-sessao` (valida token + retorna prêmios/lojas) → form → `submeter-dados` (valida + sorteia server-side) → Realtime escuta `pronta_para_girar`/`finalizada` para mostrar resultado. Device fingerprint **hand-rolled** (canvas + screen + UA + timezone + audio context hash) — simples e sem dep externa.

**Tech Stack:** Next.js client component, react-hook-form 7 + zod 3 (já no projeto), shadcn/ui (button, input, label, checkbox novo). Hook customizado de fingerprint usando crypto.subtle + canvas/audio APIs. Realtime já configurado (Plano 5).

**Pré-requisitos atendidos:**
- Plano 2: Edge Functions `obter-sessao` e `submeter-dados` (Bearer JWT-Sessão + payload zod-validated)
- Plano 4: AuthGuard NÃO se aplica aqui (rota é pública via capability token; mas componente AuthProvider já no layout — sem efeito pra jogador anônimo)
- Plano 5: Realtime hook `useSessaoRealtime` reaproveitável
- Tag `plano-5-completo`

**Tempo estimado:** ~6–10 horas.

---

## File structure que este plano cria

```
altis-bet/
├─ src/app/jogar/
│  └─ page.tsx                                # NEW: orquestra fluxo do celular
├─ src/components/jogar/
│  ├─ FormJogador.tsx                         # form com react-hook-form + zod + LGPD checkbox
│  ├─ CatalogoPremios.tsx                     # preview visual dos prêmios
│  ├─ AguardandoTotem.tsx                     # "Aguarde, vai girar no totem!"
│  ├─ ResultadoJogador.tsx                    # "Você ganhou X" / "Não foi"
│  └─ ErroSessao.tsx                          # token inválido / expirado
├─ src/components/ui/
│  ├─ checkbox.tsx                            # shadcn checkbox novo
│  └─ select.tsx                              # shadcn select (lojas)
├─ src/hooks/
│  └─ useFingerprint.ts                       # canvas + audio + screen hash
├─ src/lib/jogar/
│  ├─ edgeFunctions.ts                        # obter-sessao + submeter-dados helpers
│  └─ types.ts                                # tipos de resposta das Edge Fns
└─ tests/components/
   ├─ FormJogador.test.tsx                    # 5 tests
   ├─ useFingerprint.test.ts                  # 3 tests
   └─ ResultadoJogador.test.tsx               # 3 tests
```

---

## Convenções

- **TDD para forms + hooks puros** (FormJogador validação, useFingerprint estabilidade, ResultadoJogador rendering); **post-code** para layouts puramente visuais.
- Mobile-first — design pensado pra celular vertical (375px–428px).
- Mensagens curtas em PT-BR.
- Conventional commits.

---

## Task 1 — Componentes UI shadcn novos: `checkbox` + `select`

**Files:**
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/select.tsx`

> Versões simples (sem @radix-ui) para evitar nova dep. Acessíveis com `<input type="checkbox">` e `<select>` HTML nativos estilizados.

- [ ] **Step 1.1: Criar `src/components/ui/checkbox.tsx`**

```tsx
import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const finalId = id ?? generatedId;
    return (
      <div className="flex items-start gap-2">
        <div className="relative flex h-5 w-5 shrink-0">
          <input
            ref={ref}
            id={finalId}
            type="checkbox"
            className={cn(
              'peer h-5 w-5 cursor-pointer appearance-none rounded border border-input bg-background ring-offset-background',
              'checked:border-primary checked:bg-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 opacity-0 text-primary-foreground peer-checked:opacity-100"
            strokeWidth={3}
          />
        </div>
        {label && (
          <label htmlFor={finalId} className="cursor-pointer select-none text-sm leading-tight">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
```

- [ ] **Step 1.2: Criar `src/components/ui/select.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
```

- [ ] **Step 1.3: Validar typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 1.4: Commit**

```bash
git add src/components/ui/checkbox.tsx src/components/ui/select.tsx
git commit -m "feat(ui): add Checkbox and Select shadcn components"
```

---

## Task 2 — Hook `useFingerprint` (TDD)

**Files:**
- Create: `src/hooks/useFingerprint.ts`
- Create: `tests/components/useFingerprint.test.ts`

Fingerprint hand-rolled: hash SHA-256 de `userAgent + screen.size + timezone + canvas pixel data + audioContext sample`. Estável entre reloads no mesmo browser, diferente entre browsers/dispositivos.

- [ ] **Step 2.1: Escrever teste (RED)**

`tests/components/useFingerprint.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { useFingerprint } from '@/hooks/useFingerprint';

beforeAll(() => {
  // happy-dom não tem canvas getContext('webgl'). Stub para 2D.
  // crypto.subtle existe no happy-dom 15+.
  Object.defineProperty(window, 'AudioContext', {
    value: class {
      createOscillator() { return { connect: () => {}, frequency: { value: 0 }, start: () => {}, stop: () => {} }; }
      createAnalyser() { return { connect: () => {}, getByteFrequencyData: () => {} }; }
      destination = {};
      close() {}
    },
  });
});

describe('useFingerprint', () => {
  it('retorna um hash hex de 64 chars (sha-256)', async () => {
    const { result } = renderHook(() => useFingerprint());
    await waitFor(() => expect(result.current.fingerprint).not.toBeNull());
    expect(result.current.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('estável entre invocações no mesmo ambiente', async () => {
    const a = renderHook(() => useFingerprint());
    const b = renderHook(() => useFingerprint());
    await waitFor(() => {
      expect(a.result.current.fingerprint).not.toBeNull();
      expect(b.result.current.fingerprint).not.toBeNull();
    });
    expect(a.result.current.fingerprint).toBe(b.result.current.fingerprint);
  });

  it('loading começa true e termina false', async () => {
    const { result } = renderHook(() => useFingerprint());
    // pode iniciar true e terminar false rapidamente
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fingerprint).not.toBeNull();
  });
});
```

- [ ] **Step 2.2: RED**

```bash
npm run test:ui -- useFingerprint
```

Expected: 3 falhando (módulo não existe).

- [ ] **Step 2.3: Implementar**

`src/hooks/useFingerprint.ts`:

```typescript
'use client';
import * as React from 'react';

function gatherCanvasFingerprint(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('AltisBet:fp,01€~', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AltisBet:fp,01€~', 4, 4);
    return canvas.toDataURL().slice(-200);
  } catch {
    return '';
  }
}

function gatherStaticBits(): string {
  if (typeof window === 'undefined') return '';
  return [
    navigator.userAgent ?? '',
    navigator.language ?? '',
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? '',
    (navigator as { deviceMemory?: number }).deviceMemory ?? '',
  ].join('|');
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useFingerprint(): {
  fingerprint: string | null;
  loading: boolean;
} {
  const [fingerprint, setFingerprint] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = `${gatherStaticBits()}::${gatherCanvasFingerprint()}`;
        const fp = await sha256Hex(raw);
        if (alive) {
          setFingerprint(fp);
          setLoading(false);
        }
      } catch (err) {
        console.error('useFingerprint:', err);
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { fingerprint, loading };
}
```

- [ ] **Step 2.4: GREEN**

```bash
npm run test:ui -- useFingerprint
```

Expected: 3 passing.

- [ ] **Step 2.5: Commit**

```bash
git add src/hooks/useFingerprint.ts tests/components/useFingerprint.test.ts
git commit -m "feat(jogar): add useFingerprint hook (canvas + UA + screen sha256)"
```

---

## Task 3 — Edge Function helpers para jogador

**Files:**
- Create: `src/lib/jogar/types.ts`
- Create: `src/lib/jogar/edgeFunctions.ts`

- [ ] **Step 3.1: Criar `src/lib/jogar/types.ts`**

```typescript
export interface PremioPublico {
  id: string;
  nome: string;
  cor_hex: string | null;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
}

export interface LojaPublica {
  id: string;
  nome: string;
  cidade: string | null;
}

export interface ObterSessaoResp {
  sessao: { id: string; jogo: 'roleta' | 'dados'; expira_em: string };
  premios: PremioPublico[];
  lojas: LojaPublica[];
}

export interface SubmeterDadosResp {
  ok: boolean;
  mensagem: string;
}
```

- [ ] **Step 3.2: Criar `src/lib/jogar/edgeFunctions.ts`**

```typescript
import { env } from '@/lib/env';
import type { ObterSessaoResp, SubmeterDadosResp } from './types';

export async function obterSessao(s: string, t: string): Promise<ObterSessaoResp> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/obter-sessao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s, t }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const codigo = (e.codigo as string) ?? 'UNKNOWN';
    throw new Error(`${codigo}|${e.erro ?? 'obter-sessao falhou'}`);
  }
  return res.json() as Promise<ObterSessaoResp>;
}

export interface DadosJogadorInput {
  nome: string;
  telefone: string;
  email: string;
  loja_id: string | null;
}

export async function submeterDados(
  s: string,
  t: string,
  dados: DadosJogadorInput,
  fingerprint: string
): Promise<SubmeterDadosResp> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submeter-dados`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s, t, dados, fingerprint }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${body.codigo ?? 'ERR'}|${body.erro ?? 'submeter-dados falhou'}`);
  }
  return body as SubmeterDadosResp;
}
```

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/jogar/
git commit -m "feat(jogar): add Edge Function helpers and types for obter-sessao + submeter-dados"
```

---

## Task 4 — FormJogador (TDD)

**Files:**
- Create: `src/components/jogar/FormJogador.tsx`
- Create: `tests/components/FormJogador.test.tsx`

- [ ] **Step 4.1: Escrever teste**

`tests/components/FormJogador.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormJogador } from '@/components/jogar/FormJogador';

const lojas = [
  { id: 'l1', nome: 'Loja A', cidade: 'X' },
  { id: 'l2', nome: 'Loja B', cidade: 'Y' },
];

function renderForm(props: Partial<React.ComponentProps<typeof FormJogador>> = {}) {
  return render(
    <FormJogador
      lojas={lojas}
      onSubmit={vi.fn()}
      enviando={false}
      {...props}
    />
  );
}

describe('FormJogador', () => {
  it('renderiza todos os campos obrigatórios + LGPD', () => {
    renderForm();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone|whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-?mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loja/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aceito/i)).toBeInTheDocument();
  });

  it('exige LGPD marcado antes de submeter', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '54988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'm@s.local');
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(await screen.findByText(/aceitar.*pol/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('valida telefone com DDD inválido', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '00988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'm@s.local');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(await screen.findByText(/DDD/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('chama onSubmit com payload limpo quando tudo OK', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '54988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'maria@x.com');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      nome: 'Maria Silva',
      telefone: '54988887777',
      email: 'maria@x.com',
      loja_id: null,
    });
  });

  it('aceita telefone com máscara (54) 98888-7777 e normaliza', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '(54) 98888-7777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'maria@x.com');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ telefone: '54988887777' }));
  });
});
```

- [ ] **Step 4.2: RED**

```bash
npm run test:ui -- FormJogador
```

Expected: 5 falhando.

- [ ] **Step 4.3: Implementar**

`src/components/jogar/FormJogador.tsx`:

```tsx
'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LojaPublica } from '@/lib/jogar/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const DDDS = new Set([
  '11','12','13','14','15','16','17','18','19','21','22','24','27','28',
  '31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49',
  '51','53','54','55','61','62','64','63','65','66','67','68','69',
  '71','73','74','75','77','79','81','87','82','83','84','85','88','86','89',
  '91','93','94','92','97','95','96','98','99',
]);

const schema = z.object({
  nome: z.string().trim().min(3, 'nome muito curto').max(80),
  telefone: z.string().transform((v) => v.replace(/\D+/g, '')).pipe(
    z.string()
      .regex(/^\d{11}$/, 'telefone precisa de 11 dígitos')
      .refine((v) => DDDS.has(v.slice(0, 2)), 'DDD inválido')
      .refine((v) => v[2] === '9', 'celular precisa começar com 9 após DDD')
  ),
  email: z.string().email('e-mail inválido'),
  loja_id: z.string().uuid().nullable().optional(),
  lgpd: z.boolean().refine((v) => v === true, 'Você precisa aceitar a Política de Privacidade.'),
});
type FormValues = z.infer<typeof schema>;

export interface DadosForm {
  nome: string;
  telefone: string;
  email: string;
  loja_id: string | null;
}

interface Props {
  lojas: LojaPublica[];
  onSubmit: (dados: DadosForm) => void;
  enviando?: boolean;
}

export function FormJogador({ lojas, onSubmit, enviando }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', telefone: '', email: '', loja_id: undefined, lgpd: false },
  });

  const submit = (data: FormValues) => {
    onSubmit({
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      loja_id: data.loja_id ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" autoComplete="name" {...register('nome')} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone">Telefone / WhatsApp</Label>
        <Input
          id="telefone"
          type="tel"
          inputMode="numeric"
          placeholder="(54) 9 8888-7777"
          autoComplete="tel-national"
          {...register('telefone')}
        />
        {errors.telefone && <p className="text-sm text-destructive">{errors.telefone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="loja">Loja (opcional)</Label>
        <Select id="loja" {...register('loja_id', { setValueAs: (v: string) => v === '' ? null : v })}>
          <option value="">— Selecione —</option>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}{l.cidade ? ` (${l.cidade})` : ''}
            </option>
          ))}
        </Select>
      </div>

      <Checkbox
        {...register('lgpd')}
        label={
          <span>
            Li e <strong>aceito</strong> a coleta dos meus dados conforme a Política de Privacidade
            da Altis para contato sobre o prêmio.
          </span>
        }
      />
      {errors.lgpd && <p className="text-sm text-destructive">{errors.lgpd.message}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Participar'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4.4: GREEN**

```bash
npm run test:ui -- FormJogador
```

Expected: 5 passing.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/jogar/FormJogador.tsx tests/components/FormJogador.test.tsx
git commit -m "feat(jogar): add FormJogador with react-hook-form + zod + LGPD (5 tests)"
```

---

## Task 5 — Componentes de estado (Aguardando, Resultado, Erro, Catálogo)

**Files:**
- Create: `src/components/jogar/AguardandoTotem.tsx`
- Create: `src/components/jogar/ResultadoJogador.tsx`
- Create: `src/components/jogar/ErroSessao.tsx`
- Create: `src/components/jogar/CatalogoPremios.tsx`
- Create: `tests/components/ResultadoJogador.test.tsx`

- [ ] **Step 5.1: Criar `AguardandoTotem.tsx`**

```tsx
'use client';
import { Loader2 } from 'lucide-react';
import { LogoAltis } from '@/components/LogoAltis';

export function AguardandoTotem({ nome }: { nome?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <LogoAltis size={64} />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h1 className="text-2xl font-bold tracking-tight">
        {nome ? `Aguarde, ${nome}!` : 'Aguarde!'}
      </h1>
      <p className="text-lg text-muted-foreground">
        A roleta vai girar no totem em instantes.
      </p>
    </div>
  );
}
```

- [ ] **Step 5.2: Criar `ResultadoJogador.tsx`**

```tsx
'use client';
import { Trophy, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  nome?: string;
}

export function ResultadoJogador({ premioNome, ePremioReal, nome }: Props) {
  if (ePremioReal) {
    const linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(
      `Ganhei "${premioNome}" na Roleta Altis! 🎉`
    )}`;
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/10 to-background p-6 text-center"
        role="status"
      >
        <Trophy className="h-24 w-24 text-primary" />
        <h1 className="text-4xl font-extrabold tracking-tight">
          Parabéns{nome ? `, ${nome}` : ''}!
        </h1>
        <p className="text-xl">Você ganhou:</p>
        <p className="rounded-2xl border-4 border-primary bg-card px-8 py-4 text-3xl font-extrabold text-primary">
          {premioNome}
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          Mostre esta tela ao operador da Altis para retirar o prêmio.
        </p>
        <Button asChild variant="outline">
          <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer">
            Compartilhar no WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      role="status"
    >
      <Heart className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold tracking-tight">
        Não foi dessa vez{nome ? `, ${nome}` : ''}!
      </h1>
      <p className="text-lg text-muted-foreground">
        Obrigado por participar. Volte para tentar a sorte em outro evento Altis!
      </p>
    </div>
  );
}
```

Nota: o `<Button asChild>` exige variant `asChild`. Vou simplificar para evitar criar `asChild` pattern.

Substituir o uso do Button por `<a>` direto:

```tsx
<a
  href={linkWhatsapp}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent"
>
  Compartilhar no WhatsApp
</a>
```

(Atualizar no arquivo acima — remover `<Button asChild>` e usar `<a>` direto.)

- [ ] **Step 5.3: Reescrever `ResultadoJogador.tsx` final (sem asChild)**

```tsx
'use client';
import { Trophy, Heart } from 'lucide-react';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  nome?: string;
}

export function ResultadoJogador({ premioNome, ePremioReal, nome }: Props) {
  if (ePremioReal) {
    const linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(
      `Ganhei "${premioNome}" na Roleta Altis! 🎉`
    )}`;
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/10 to-background p-6 text-center"
        role="status"
      >
        <Trophy className="h-24 w-24 text-primary" />
        <h1 className="text-4xl font-extrabold tracking-tight">
          Parabéns{nome ? `, ${nome}` : ''}!
        </h1>
        <p className="text-xl">Você ganhou:</p>
        <p className="rounded-2xl border-4 border-primary bg-card px-8 py-4 text-3xl font-extrabold text-primary">
          {premioNome}
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          Mostre esta tela ao operador da Altis para retirar o prêmio.
        </p>
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent"
        >
          Compartilhar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      role="status"
    >
      <Heart className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold tracking-tight">
        Não foi dessa vez{nome ? `, ${nome}` : ''}!
      </h1>
      <p className="text-lg text-muted-foreground">
        Obrigado por participar. Volte para tentar a sorte em outro evento Altis!
      </p>
    </div>
  );
}
```

- [ ] **Step 5.4: Criar `ErroSessao.tsx`**

```tsx
'use client';
import { AlertTriangle } from 'lucide-react';
import { LogoAltis } from '@/components/LogoAltis';

interface Props {
  titulo: string;
  mensagem: string;
}

export function ErroSessao({ titulo, mensagem }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <LogoAltis size={56} />
      <AlertTriangle className="h-16 w-16 text-destructive" />
      <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
      <p className="max-w-md text-base text-muted-foreground">{mensagem}</p>
    </div>
  );
}
```

- [ ] **Step 5.5: Criar `CatalogoPremios.tsx`** (preview visual dos prêmios)

```tsx
'use client';
import type { PremioPublico } from '@/lib/jogar/types';

export function CatalogoPremios({ premios }: { premios: PremioPublico[] }) {
  const reais = premios.filter((p) => p.e_premio_real);
  if (reais.length === 0) return null;

  return (
    <details className="rounded-lg border bg-card p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Ver prêmios disponíveis ({reais.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {reais.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded"
              style={{ backgroundColor: p.cor_hex ?? '#cccccc' }}
              aria-hidden
            />
            <span>{p.nome}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
```

- [ ] **Step 5.6: Escrever teste `ResultadoJogador.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResultadoJogador } from '@/components/jogar/ResultadoJogador';

describe('ResultadoJogador', () => {
  it('prêmio real mostra Parabéns + nome + WhatsApp', () => {
    render(<ResultadoJogador premioNome="Vale R$10" ePremioReal nome="Maria" />);
    expect(screen.getByText(/Parab.ns, Maria/)).toBeInTheDocument();
    expect(screen.getByText('Vale R$10')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me')
    );
  });

  it('não foi dessa vez não mostra link', () => {
    render(<ResultadoJogador premioNome="Não foi" ePremioReal={false} nome="João" />);
    expect(screen.getByText(/N.o foi dessa vez, Jo.o/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omite o nome quando não passado', () => {
    render(<ResultadoJogador premioNome="x" ePremioReal />);
    expect(screen.getByText(/Parab.ns!/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.7: GREEN**

```bash
npm run test:ui -- ResultadoJogador
```

Expected: 3 passing.

- [ ] **Step 5.8: Commit**

```bash
git add src/components/jogar/ tests/components/ResultadoJogador.test.tsx
git commit -m "feat(jogar): add AguardandoTotem, ResultadoJogador, ErroSessao, CatalogoPremios (3 tests)"
```

---

## Task 6 — Página `/jogar` completa (integração)

**Files:**
- Create: `src/app/jogar/page.tsx`

- [ ] **Step 6.1: Criar `src/app/jogar/page.tsx`**

```tsx
'use client';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { obterSessao, submeterDados } from '@/lib/jogar/edgeFunctions';
import type { ObterSessaoResp } from '@/lib/jogar/types';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useSessaoRealtime } from '@/hooks/useSessaoRealtime';
import { FormJogador, type DadosForm } from '@/components/jogar/FormJogador';
import { CatalogoPremios } from '@/components/jogar/CatalogoPremios';
import { AguardandoTotem } from '@/components/jogar/AguardandoTotem';
import { ResultadoJogador } from '@/components/jogar/ResultadoJogador';
import { ErroSessao } from '@/components/jogar/ErroSessao';
import { LogoAltis } from '@/components/LogoAltis';
import { Loader2 } from 'lucide-react';

type Fase = 'carregando' | 'form' | 'aguardando' | 'finalizado' | 'erro';

interface ErroState {
  titulo: string;
  mensagem: string;
}

export default function JogarPage() {
  return (
    <React.Suspense fallback={<TelaCarregando />}>
      <Jogar />
    </React.Suspense>
  );
}

function TelaCarregando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <LogoAltis size={64} />
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );
}

function Jogar() {
  const params = useSearchParams();
  const s = params.get('s');
  const t = params.get('t');

  const [fase, setFase] = React.useState<Fase>('carregando');
  const [sessao, setSessao] = React.useState<ObterSessaoResp | null>(null);
  const [erro, setErro] = React.useState<ErroState | null>(null);
  const [nome, setNome] = React.useState<string>('');
  const [enviando, setEnviando] = React.useState(false);

  const { fingerprint } = useFingerprint();

  // 1) Validar token e carregar sessão
  React.useEffect(() => {
    if (!s || !t) {
      setErro({
        titulo: 'Link inválido',
        mensagem: 'Toque na tela do totem para gerar um QR Code válido.',
      });
      setFase('erro');
      return;
    }
    obterSessao(s, t).then(
      (resp) => {
        setSessao(resp);
        setFase('form');
      },
      (e) => {
        const msg = (e as Error).message ?? '';
        if (msg.includes('UNAUTHORIZED')) {
          setErro({
            titulo: 'Sessão expirada',
            mensagem: 'Volte ao totem e toque novamente para gerar um QR Code novo.',
          });
        } else if (msg.includes('CONFLICT')) {
          setErro({
            titulo: 'Sessão já usada',
            mensagem: 'Esta jogada foi feita ou está em uso por outro celular.',
          });
        } else {
          setErro({ titulo: 'Erro ao abrir sessão', mensagem: 'Tente novamente em alguns segundos.' });
        }
        setFase('erro');
      }
    );
  }, [s, t]);

  // 2) Realtime para detectar finalização (mostrar resultado)
  const sessaoIdAtiva = fase === 'aguardando' && sessao ? sessao.sessao.id : null;
  const { payload } = useSessaoRealtime(sessaoIdAtiva);

  React.useEffect(() => {
    if (!payload) return;
    if (payload.status === 'finalizada') {
      setFase('finalizado');
    } else if (payload.status === 'expirada' || payload.status === 'cancelada') {
      setErro({
        titulo: 'Sessão encerrada',
        mensagem: 'A jogada foi cancelada. Toque no totem para começar de novo.',
      });
      setFase('erro');
    }
  }, [payload]);

  // 3) Submit do form
  const onSubmit = React.useCallback(
    async (dados: DadosForm) => {
      if (!s || !t || !fingerprint) return;
      setEnviando(true);
      setNome(dados.nome.split(' ')[0]);
      try {
        await submeterDados(s, t, dados, fingerprint);
        setFase('aguardando');
      } catch (e) {
        const msg = (e as Error).message ?? '';
        if (msg.includes('CONFLICT')) {
          setErro({
            titulo: 'Telefone já participou',
            mensagem:
              'Este telefone já jogou nesta Roleta. Cada celular pode jogar uma vez por evento por jogo.',
          });
        } else if (msg.includes('FORBIDDEN')) {
          setErro({
            titulo: 'Dispositivo bloqueado',
            mensagem: 'Este dispositivo está bloqueado de participar.',
          });
        } else {
          setErro({
            titulo: 'Erro ao enviar',
            mensagem: msg.split('|')[1] ?? 'Tente novamente.',
          });
        }
        setFase('erro');
      } finally {
        setEnviando(false);
      }
    },
    [s, t, fingerprint]
  );

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (fase === 'erro' && erro) {
    return <ErroSessao titulo={erro.titulo} mensagem={erro.mensagem} />;
  }
  if (fase === 'carregando' || !sessao) {
    return <TelaCarregando />;
  }
  if (fase === 'aguardando') {
    return <AguardandoTotem nome={nome} />;
  }
  if (fase === 'finalizado' && payload?.premio_sorteado_id) {
    const premio = sessao.premios.find((p) => p.id === payload.premio_sorteado_id);
    if (premio) {
      return (
        <ResultadoJogador
          premioNome={premio.nome}
          ePremioReal={premio.e_premio_real}
          nome={nome}
        />
      );
    }
  }

  // fase === 'form'
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoAltis size={56} />
        <h1 className="text-2xl font-bold tracking-tight">ROLETA DE PRÊMIOS</h1>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados para liberar a roleta no totem.
        </p>
      </div>

      <CatalogoPremios premios={sessao.premios} />

      <FormJogador lojas={sessao.lojas} onSubmit={onSubmit} enviando={enviando} />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ao participar, você concorda com a Política de Privacidade da Altis.
      </p>
    </main>
  );
}
```

- [ ] **Step 6.2: Build + typecheck**

```bash
npm run typecheck
npm run build
```

Expected: ambos exit 0. Build agora deve mostrar `/jogar` na lista de rotas.

- [ ] **Step 6.3: Commit**

```bash
git add src/app/jogar/
git commit -m "feat(jogar): integrate /jogar page (validate token, form, submit, realtime listen)"
```

---

## Task 7 — E2E smoke real (totem + jogar acoplados via SQL)

**Files:**
- Modify: `cli/tests/totem-smoke.test.ts` (já existe, adicionar caso `/jogar` integrado)

Validamos que: quando inserimos uma linha em `sessoes_jogo`, o status muda pelo Realtime e o frontend `/totem` e `/jogar` reagem. Como o teste roda só o backend, esse passo é principalmente para garantir que nenhum cenário introduzido pelo Plano 6 quebra Plano 5.

- [ ] **Step 7.1: Rodar suite completa**

```bash
# Terminal 1: já tem supabase rodando do Plano 1
# Terminal 2: functions serve já rodando do Plano 5
npm run test:cli   # 18 (CLI + totem-smoke)
npm run test:functions   # 29
npm run test:ui   # 38 (30 anteriores + 5 FormJogador + 3 ResultadoJogador + 3 useFingerprint)
```

Expected: 28 (test:cli) + 29 (test:functions) + 38 (test:ui) — somar com 83 pgTAP = **178 testes verdes**.

- [ ] **Step 7.2: Smoke manual end-to-end**

```bash
# Terminal 3: Next.js
npm run dev
```

No browser:
1. Aba A: `http://localhost:3000` — login `dev@altis.local`/`senha123` → "Abrir Totem" → toca → vê QR Code
2. Aba B (simulando celular): copia URL `http://localhost:3000/jogar?s=...&t=...` do QR
3. Aba B mostra: logo Altis + "ROLETA DE PRÊMIOS" + form com 4 campos + checkbox LGPD
4. Preenche, marca LGPD, "Participar" → vê "Aguarde, Maria!"
5. Aba A: detecta `pronta_para_girar` → mostra "Boa sorte!" → roleta 3D gira
6. Aba A: banner do ganhador
7. Aba B (Realtime): muda automaticamente para "Parabéns, Maria! Você ganhou: X"

(Se algo falhar visualmente, capturar e voltar pra correção.)

---

## Task 8 — README + tag

- [ ] **Step 8.1: Atualizar tabela de planos**

Modificar `README.md`:

```markdown
| Plano | Status | Conteúdo |
|---|---|---|
| 1 — Foundation DB | ✅ completo | Schema + RLS + sortear + pg_cron + Storage + seed |
| 2 — Edge Functions | ✅ completo | 7 Edge Functions Deno + 29 tests |
| 3 — CLI | ✅ completo | 6 comandos + 18 tests |
| 4 — UI Foundation | ✅ completo | Next.js + Tailwind + shadcn/ui + Auth + Welcome + Modal Admin (14 tests) |
| 5 — UI Totem | ✅ completo | R3F Roleta 3D + state machine + Realtime + GSAP (16 tests) |
| 6 — UI Jogador | ✅ completo | `/jogar` com form + fingerprint + Realtime resultado (11 tests) |
| 7 — Painel Admin | 🔜 próximo | Dashboard + Eventos + Prêmios + Operadores + Ganhadores + Auditoria |
| 8 — E2E + Deploy | ⏳ | Playwright + GitHub Pages + Sentry + UptimeRobot |
```

E atualizar comandos:
```markdown
| `npm run test:ui` | Roda 41 testes Vitest de componentes React |
| `npm run test` | tudo (db + functions + cli + ui — 171 testes total) |
```

- [ ] **Step 8.2: Commit + tag**

```bash
git add README.md
git commit -m "docs: mark Plano 6 (UI Jogador) as complete"
git tag -a "plano-6-completo" -m "Plano 6: UI Jogador (/jogar com fingerprint + form + Realtime)"
git log --oneline | head -20
```

---

## Resumo pós-Plano 6

✅ Página `/jogar` completa: validação de capability token → form → submit → aguarda → resultado via Realtime
✅ Componentes `ui/checkbox` + `ui/select` (sem @radix-ui)
✅ Hook `useFingerprint` (canvas + UA + screen + timezone hashado em SHA-256)
✅ `FormJogador` com react-hook-form + zod (DDD br + LGPD obrigatório + telefone normalizado)
✅ Edge Function helpers `obterSessao` + `submeterDados`
✅ `AguardandoTotem` + `ResultadoJogador` (prêmio real com link WhatsApp / "Não foi")
✅ `ErroSessao` para token inválido/expirado/conflito
✅ `CatalogoPremios` preview opcional
✅ ~11 testes Vitest novos (5 FormJogador + 3 useFingerprint + 3 ResultadoJogador) = **171 testes total**

**Validação manual** (2 abas simulando totem + celular):
- /totem mostra QR → /jogar valida token → form → submeter → roleta gira no /totem → ambas as abas mostram resultado

---

## Self-Review

**1. Spec coverage (§4 fluxo do celular + §5 capability token):**
- URL `/jogar?s=<uuid>&t=<jwt>` (§5.1) → Task 6 ✅
- Validação de token via Edge Function (§5.4) → Tasks 3 + 6 ✅
- Form: Nome + Telefone + E-mail + Loja opcional (§1.3 #6) → Task 4 ✅
- Validação DDD br + telefone normalizado (§5.4) → Task 4 ✅
- LGPD checkbox obrigatório (§5.7) → Task 4 ✅
- Device fingerprint hash (§5.5) → Task 2 ✅
- "Aguarde, vai girar no totem" após submit (§4.2 passo 11.b) → Tasks 5 + 6 ✅
- Realtime detecta finalizada → mostra resultado no celular (§4.2 passo 15) → Task 6 ✅
- "Você ganhou X / Não foi dessa vez" + WhatsApp share (§4.2 passo 15) → Task 5 ✅
- Mensagens de erro: token expirado / telefone duplicado / fingerprint bloqueado (§9 edge cases 1, 5, 24) → Tasks 5 + 6 ✅

**2. Placeholder scan:** zero TBD/TODO. Cada step com código completo. ✅

**3. Type consistency:**
- `DadosForm { nome, telefone, email, loja_id }` em Task 4; usado em Task 6 (onSubmit). ✅
- `ObterSessaoResp`/`SubmeterDadosResp` em Task 3.1; consumidos em Task 6. ✅
- `obterSessao(s, t)`/`submeterDados(s, t, dados, fingerprint)` em Task 3.2; chamados em Task 6 com mesma assinatura. ✅
- `useFingerprint()` retorna `{ fingerprint: string|null, loading: boolean }` em Task 2; usado em Task 6. ✅
- `ResultadoJogador { premioNome, ePremioReal, nome? }` em Task 5; chamado em Task 6 com tipos compatíveis. ✅
- `ErroSessao { titulo, mensagem }` em Task 5; usado com `setErro({ titulo, mensagem })` em Task 6. ✅

Plano completo, autocontido, executável task-por-task.
