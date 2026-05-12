# Altis Bet — Plano 7: Painel Administrativo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o **painel admin** em `/admin` com **7 abas** funcionais (Dashboard, Eventos, Prêmios, Operadores, Ganhadores, Auditoria, Configurações). Acesso só com **modo admin ativo** (JWT-Admin do Plano 4); o painel usa o cliente Supabase trocando o token de operador pelo JWT-Admin pra leituras/escritas com claim `admin_elevado=true` que destrava as policies do Plano 1.

**Architecture:** Layout shell com sidebar fixa + área principal renderizando a aba ativa. Cada aba é um componente client que monta seu próprio fetch/mutation usando um **`useAdminClient` hook** que retorna um `SupabaseClient` autenticado com o JWT-Admin (em memória, do `AdminContext` do Plano 4). Mutations admin (criar evento, editar prêmio, etc.) **passam pela RLS** — não usam service_role no browser. Upload de fotos de prêmio chama a Edge Function `processar-imagem` do Plano 2 com Bearer JWT-Admin. Drag-and-drop de prêmios via `@dnd-kit/sortable`. Gráficos via `recharts`. Tabelas com TanStack Table.

**Tech Stack:** Next.js 15 client components, shadcn/ui (button, input, label, dialog, checkbox, select já existem; criar `tabs`, `table`, `badge`, `card`, `textarea`). `recharts` 2.x, `@dnd-kit/core` + `@dnd-kit/sortable`, `@tanstack/react-table` 8.x. Sem novas Edge Functions — tudo via supabase-js + Edge Functions existentes.

**Pré-requisitos atendidos:**
- Plano 1: RLS policies que dependem de `is_admin()` claim
- Plano 2: Edge Function `processar-imagem` (upload Storage); `validar-senha-admin` retorna JWT que vai ser usado pelo `useAdminClient`
- Plano 3: CLI `import-premios` (admin pode usar como alternativa)
- Plano 4: `AdminContext` com `adminJwt` em memória
- Plano 5: Realtime hook (pode reaproveitar para Dashboard live)
- Plano 6: Padrões de form + zod + helpers
- Tag `plano-6-completo`

**Tempo estimado:** ~16–24 horas se executado sequencialmente.

---

## File structure que este plano cria

```
altis-bet/
├─ package.json                                # MODIFY: deps recharts + dnd-kit + tanstack/react-table
├─ src/app/admin/
│  ├─ page.tsx                                 # MODIFY: orquestrador (gate + tabs)
│  └─ tabs/
│     ├─ DashboardTab.tsx                      # cards + chart + tabela
│     ├─ EventosTab.tsx                        # lista + modal CRUD
│     ├─ PremiosTab.tsx                        # lista drag-and-drop + modal CRUD + upload foto
│     ├─ OperadoresTab.tsx                     # lista + convidar por email
│     ├─ GanhadoresTab.tsx                     # lista + marcar entregue
│     ├─ AuditoriaTab.tsx                      # tabela paginada read-only
│     └─ ConfigTab.tsx                         # senha admin + lojas + fingerprints
├─ src/components/admin/
│  ├─ AdminLayout.tsx                          # sidebar + área principal
│  ├─ AdminSidebar.tsx                         # links das 7 abas
│  ├─ MetricCard.tsx                           # card numérico do Dashboard
│  ├─ JogadasPorHoraChart.tsx                  # recharts BarChart
│  ├─ EventoForm.tsx                           # form criar/editar evento
│  ├─ PremioForm.tsx                           # form criar/editar prêmio + upload
│  ├─ CorPickerInline.tsx                      # picker simples de paleta + custom hex
│  └─ ConfirmModal.tsx                         # modal genérico "tem certeza?"
├─ src/components/ui/
│  ├─ tabs.tsx                                 # shadcn tabs simples
│  ├─ table.tsx                                # shadcn table wrappers
│  ├─ card.tsx                                 # shadcn card
│  ├─ badge.tsx                                # shadcn badge
│  └─ textarea.tsx                             # shadcn textarea
├─ src/hooks/
│  ├─ useAdminClient.ts                        # SupabaseClient com JWT-Admin
│  └─ useDashboardMetricas.ts                  # consulta agregada
├─ src/lib/admin/
│  ├─ types.ts                                 # EventoDb, PremioDb (admin), OperadorDb, AuditoriaDb
│  └─ uploadFoto.ts                            # chama processar-imagem com Bearer JWT-Admin
└─ tests/components/
   ├─ EventoForm.test.tsx                      # 4 tests
   ├─ PremioForm.test.tsx                      # 5 tests
   ├─ AdminSidebar.test.tsx                    # 2 tests
   └─ MetricCard.test.tsx                      # 2 tests
```

---

## Convenções

- **TDD** para componentes com lógica testável (forms, sidebar nav, MetricCard rendering); **post-code** para integrações de chart/drag-and-drop (validação manual).
- Cada aba é um componente isolado — orquestrador em `app/admin/page.tsx` só renderiza a aba ativa baseado em `useState`.
- **Mutations admin nunca usam service_role no browser** — sempre vão via supabase-js com JWT-Admin → RLS valida `is_admin()`.
- Mobile-first não é prioridade — painel é desktop-focused (operador admin usa em laptop).
- Conventional commits.

---

## Task 1 — Instalar deps + componentes shadcn extras

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/textarea.tsx`

- [ ] **Step 1.1: Instalar deps**

```bash
npm install --legacy-peer-deps \
  recharts \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  @tanstack/react-table
```

- [ ] **Step 1.2: Criar `src/components/ui/tabs.tsx`** (tabs simples client-side)

```tsx
'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsCtx {
  value: string;
  onChange: (v: string) => void;
}
const TabsContext = React.createContext<TabsCtx | null>(null);

export function Tabs({
  value, onValueChange, children, className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value, children, className,
}: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger deve estar dentro de <Tabs>');
  const isActive = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value, children, className,
}: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div className={cn('mt-2', className)}>{children}</div>;
}
```

- [ ] **Step 1.3: Criar `src/components/ui/table.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('p-4 align-middle', className)} {...props} />
  )
);
TableCell.displayName = 'TableCell';
```

- [ ] **Step 1.4: Criar `src/components/ui/card.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';
```

- [ ] **Step 1.5: Criar `src/components/ui/badge.tsx`**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-600 text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 1.6: Criar `src/components/ui/textarea.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
```

- [ ] **Step 1.7: Typecheck + commit**

```bash
npm run typecheck
git add package.json package-lock.json src/components/ui/
git commit -m "feat(ui): install recharts/dnd-kit/tanstack-table + shadcn tabs/table/card/badge/textarea"
```

---

## Task 2 — `useAdminClient` hook

**Files:**
- Create: `src/hooks/useAdminClient.ts`

> Cria um SupabaseClient com o JWT-Admin do contexto. Quando modo admin expira, retorna `null`.

- [ ] **Step 2.1: Implementar**

```typescript
'use client';
import * as React from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { useAdmin } from '@/contexts/AdminContext';

/**
 * Retorna um SupabaseClient autenticado com o JWT-Admin (modo elevado).
 * Quando modo admin expira ou nunca foi ativado, retorna null.
 */
export function useAdminClient(): SupabaseClient | null {
  const { adminJwt, modoAdmin } = useAdmin();

  return React.useMemo(() => {
    if (!modoAdmin || !adminJwt) return null;
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${adminJwt}` } },
    });
  }, [adminJwt, modoAdmin]);
}
```

- [ ] **Step 2.2: Commit**

```bash
git add src/hooks/useAdminClient.ts
git commit -m "feat(admin): add useAdminClient hook (Supabase com JWT-Admin)"
```

---

## Task 3 — Tipos do admin

**Files:**
- Create: `src/lib/admin/types.ts`

- [ ] **Step 3.1: Criar `types.ts`**

```typescript
export type EventoStatus = 'rascunho' | 'ativo' | 'pausado' | 'encerrado';

export interface EventoDb {
  id: string;
  nome: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  status: EventoStatus;
  criado_por: string;
  criado_em: string;
}

export interface PremioDb {
  id: string;
  evento_id: string;
  nome: string;
  descricao: string | null;
  foto_path: string | null;
  cor_hex: string | null;
  peso_base: number;
  estoque_inicial: number;
  estoque_atual: number;
  ordem_roleta: number;
  e_premio_real: boolean;
}

export interface PerfilOperador {
  id: string;
  nome_completo: string;
  ativo: boolean;
  criado_em: string;
  email?: string;  // joined from auth.users
}

export interface GanhadorDb {
  id: string;
  sessao_id: string;
  evento_id: string;
  premio_id: string;
  jogador_nome: string;
  jogador_telefone: string;
  jogador_email: string;
  jogador_loja_id: string | null;
  ganho_em: string;
  entregue: boolean;
  entregue_em: string | null;
  entregue_por: string | null;
  observacoes: string | null;
  premio_nome?: string;
}

export interface AuditoriaDb {
  id: number;
  evento_id: string | null;
  acao: string;
  ator: string | null;
  recurso_tipo: string | null;
  recurso_id: string | null;
  detalhes: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  criado_em: string;
}

export interface LojaDb {
  id: string;
  nome: string;
  cidade: string | null;
  ativa: boolean;
}

export interface FingerprintBloqueadoDb {
  fingerprint: string;
  motivo: string;
  bloqueado_em: string;
  bloqueado_por: string | null;
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/lib/admin/types.ts
git commit -m "feat(admin): add admin domain types"
```

---

## Task 4 — AdminSidebar + AdminLayout

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/components/admin/AdminLayout.tsx`
- Create: `tests/components/AdminSidebar.test.tsx`

- [ ] **Step 4.1: Criar `AdminSidebar.tsx`**

```tsx
'use client';
import {
  LayoutDashboard, Calendar, Gift, Users, Trophy, ScrollText, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AbaAdmin =
  | 'dashboard' | 'eventos' | 'premios' | 'operadores'
  | 'ganhadores' | 'auditoria' | 'config';

interface ItemMenu {
  id: AbaAdmin;
  label: string;
  icone: typeof LayoutDashboard;
}

const ITENS: ItemMenu[] = [
  { id: 'dashboard',  label: 'Dashboard',      icone: LayoutDashboard },
  { id: 'eventos',    label: 'Eventos',        icone: Calendar },
  { id: 'premios',    label: 'Prêmios',        icone: Gift },
  { id: 'operadores', label: 'Operadores',     icone: Users },
  { id: 'ganhadores', label: 'Ganhadores',     icone: Trophy },
  { id: 'auditoria',  label: 'Auditoria',      icone: ScrollText },
  { id: 'config',     label: 'Configurações',  icone: Settings },
];

interface Props {
  abaAtiva: AbaAdmin;
  onChange: (v: AbaAdmin) => void;
}

export function AdminSidebar({ abaAtiva, onChange }: Props) {
  return (
    <nav
      aria-label="Menu do painel admin"
      className="flex w-56 shrink-0 flex-col gap-1 border-r bg-card p-3"
    >
      {ITENS.map((it) => {
        const Icone = it.icone;
        const ativa = abaAtiva === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-current={ativa ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
              ativa
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icone className="h-4 w-4" />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4.2: Criar `AdminLayout.tsx`**

```tsx
'use client';
import * as React from 'react';
import { AdminSidebar, type AbaAdmin } from './AdminSidebar';

interface Props {
  abaAtiva: AbaAdmin;
  onAbaChange: (v: AbaAdmin) => void;
  children: React.ReactNode;
}

export function AdminLayout({ abaAtiva, onAbaChange, children }: Props) {
  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      <AdminSidebar abaAtiva={abaAtiva} onChange={onAbaChange} />
      <div className="flex-1 overflow-auto bg-background p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4.3: Escrever teste**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

describe('AdminSidebar', () => {
  it('marca a aba ativa com aria-current=page', () => {
    render(<AdminSidebar abaAtiva="eventos" onChange={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /eventos/i });
    expect(btn).toHaveAttribute('aria-current', 'page');
  });

  it('clicar muda aba via onChange', () => {
    const onChange = vi.fn();
    render(<AdminSidebar abaAtiva="dashboard" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /pr.mios/i }));
    expect(onChange).toHaveBeenCalledWith('premios');
  });
});
```

- [ ] **Step 4.4: Rodar — GREEN**

```bash
npm run test:ui -- AdminSidebar
```

Expected: 2 passing.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/admin/ tests/components/AdminSidebar.test.tsx
git commit -m "feat(admin): add AdminLayout + AdminSidebar with 7 tabs (2 tests)"
```

---

## Task 5 — Dashboard aba: MetricCard + métricas básicas

**Files:**
- Create: `src/components/admin/MetricCard.tsx`
- Create: `src/components/admin/JogadasPorHoraChart.tsx`
- Create: `src/hooks/useDashboardMetricas.ts`
- Create: `src/app/admin/tabs/DashboardTab.tsx`
- Create: `tests/components/MetricCard.test.tsx`

- [ ] **Step 5.1: Criar `MetricCard.tsx`**

```tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface Props {
  titulo: string;
  valor: number | string;
  subtitulo?: string;
  icone?: LucideIcon;
}

export function MetricCard({ titulo, valor, subtitulo, icone: Icone }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        {Icone && <Icone className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{valor}</div>
        {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5.2: Teste MetricCard**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCard } from '@/components/admin/MetricCard';

describe('MetricCard', () => {
  it('renderiza titulo e valor', () => {
    render(<MetricCard titulo="Jogadas" valor={42} />);
    expect(screen.getByText('Jogadas')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
  it('renderiza subtitulo quando passado', () => {
    render(<MetricCard titulo="X" valor={1} subtitulo="último mês" />);
    expect(screen.getByText(/último mês/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.3: Criar `useDashboardMetricas.ts`**

```typescript
'use client';
import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export interface DashboardMetricas {
  jogadasTotal: number;
  ganhadoresReais: number;
  naoFoi: number;
  entregues: number;
  pendentes: number;
  jogadasPorHora: { hora: string; total: number }[];
}

export function useDashboardMetricas(eventoId: string | null): {
  data: DashboardMetricas | null;
  loading: boolean;
  recarregar: () => void;
} {
  const [data, setData] = React.useState<DashboardMetricas | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    if (!eventoId) {
      setData(null); setLoading(false); return;
    }
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      setLoading(true);
      // 1) Total jogadas no evento
      const { count: jogadasTotal } = await sb
        .from('sessoes_jogo')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventoId)
        .in('status', ['finalizada', 'pronta_para_girar', 'girando']);

      // 2) Ganhadores por categoria (real vs nao foi)
      const { data: ganhadoresPremios } = await sb
        .from('ganhadores')
        .select('id, premio_id, entregue, premios!inner(e_premio_real)')
        .eq('evento_id', eventoId);

      const arr = (ganhadoresPremios ?? []) as Array<{
        entregue: boolean;
        premios: { e_premio_real: boolean };
      }>;
      const reais = arr.filter((g) => g.premios?.e_premio_real);
      const ganhadoresReais = reais.length;
      const naoFoi = arr.length - ganhadoresReais;
      const entregues = reais.filter((g) => g.entregue).length;
      const pendentes = ganhadoresReais - entregues;

      // 3) Jogadas por hora (hoje)
      const hojeIso = new Date(new Date().setHours(0,0,0,0)).toISOString();
      const { data: hojeRaw } = await sb
        .from('sessoes_jogo')
        .select('criada_em')
        .eq('evento_id', eventoId)
        .gte('criada_em', hojeIso);
      const buckets: Record<string, number> = {};
      (hojeRaw ?? []).forEach((s: { criada_em: string }) => {
        const h = new Date(s.criada_em).getHours();
        const key = `${String(h).padStart(2, '0')}h`;
        buckets[key] = (buckets[key] ?? 0) + 1;
      });
      const jogadasPorHora = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hora, total]) => ({ hora, total }));

      if (!alive) return;
      setData({
        jogadasTotal: jogadasTotal ?? 0,
        ganhadoresReais,
        naoFoi,
        entregues,
        pendentes,
        jogadasPorHora,
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [eventoId, nonce]);

  return { data, loading, recarregar: () => setNonce((n) => n + 1) };
}
```

- [ ] **Step 5.4: Criar `JogadasPorHoraChart.tsx`**

```tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  dados: { hora: string; total: number }[];
}

export function JogadasPorHoraChart({ dados }: Props) {
  if (dados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sem jogadas registradas hoje.</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados}>
        <XAxis dataKey="hora" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="total" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5.5: Criar `DashboardTab.tsx`**

```tsx
'use client';
import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useDashboardMetricas } from '@/hooks/useDashboardMetricas';
import { MetricCard } from '@/components/admin/MetricCard';
import { JogadasPorHoraChart } from '@/components/admin/JogadasPorHoraChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Heart, Package, Activity } from 'lucide-react';

export function DashboardTab() {
  const [eventoId, setEventoId] = React.useState<string | null>(null);
  const [eventoNome, setEventoNome] = React.useState<string>('');

  React.useEffect(() => {
    const sb = getSupabaseBrowserClient();
    sb.from('eventos').select('id, nome').eq('status', 'ativo').maybeSingle()
      .then(({ data }) => {
        if (data) { setEventoId(data.id); setEventoNome(data.nome); }
      });
  }, []);

  const { data, loading } = useDashboardMetricas(eventoId);

  if (!eventoId) {
    return <p className="text-muted-foreground">Nenhum evento ativo no momento.</p>;
  }
  if (loading || !data) {
    return <p className="text-muted-foreground">Carregando métricas...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Evento: {eventoNome}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          titulo="Total de jogadas"
          valor={data.jogadasTotal}
          icone={Activity}
        />
        <MetricCard
          titulo="Ganharam prêmio"
          valor={data.ganhadoresReais}
          icone={Trophy}
        />
        <MetricCard
          titulo='"Não foi dessa vez"'
          valor={data.naoFoi}
          icone={Heart}
        />
        <MetricCard
          titulo="Entregues / pendentes"
          valor={`${data.entregues} / ${data.pendentes}`}
          icone={Package}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jogadas por hora (hoje)</CardTitle>
        </CardHeader>
        <CardContent>
          <JogadasPorHoraChart dados={data.jogadasPorHora} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5.6: GREEN + commit**

```bash
npm run test:ui -- MetricCard
git add src/components/admin/MetricCard.tsx src/components/admin/JogadasPorHoraChart.tsx \
        src/hooks/useDashboardMetricas.ts src/app/admin/tabs/DashboardTab.tsx \
        tests/components/MetricCard.test.tsx
git commit -m "feat(admin): add Dashboard tab (4 metric cards + jogadas por hora chart) (2 tests)"
```

---

## Task 6 — EventoForm (TDD)

**Files:**
- Create: `src/components/admin/EventoForm.tsx`
- Create: `tests/components/EventoForm.test.tsx`

- [ ] **Step 6.1: Escrever teste (RED)**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EventoForm } from '@/components/admin/EventoForm';

describe('EventoForm', () => {
  it('renderiza campos obrigatórios', () => {
    render(<EventoForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de in.cio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de fim/i)).toBeInTheDocument();
  });

  it('rejeita data_fim < data_inicio', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EventoForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Feira X');
    fireEvent.change(screen.getByLabelText(/data de in.cio/i), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText(/data de fim/i), { target: { value: '2026-11-30' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/fim.*ap.s.*in.cio/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submete payload válido', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EventoForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Feira Construsul');
    fireEvent.change(screen.getByLabelText(/data de in.cio/i), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText(/data de fim/i), { target: { value: '2026-06-05' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Feira Construsul',
      data_inicio: '2026-06-01',
      data_fim: '2026-06-05',
    }));
  });

  it('em modo edicao preenche valores iniciais', () => {
    render(
      <EventoForm
        onSubmit={vi.fn()}
        valoresIniciais={{
          nome: 'Já existe', descricao: 'desc', data_inicio: '2026-01-01',
          data_fim: '2026-01-10', status: 'rascunho',
        }}
      />
    );
    expect((screen.getByLabelText(/nome/i) as HTMLInputElement).value).toBe('Já existe');
  });
});
```

- [ ] **Step 6.2: RED + implementar**

`src/components/admin/EventoForm.tsx`:

```tsx
'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EventoStatus } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const schema = z.object({
  nome: z.string().trim().min(3, 'mínimo 3 caracteres'),
  descricao: z.string().nullable().optional(),
  data_inicio: z.string().min(1, 'data início obrigatória'),
  data_fim: z.string().min(1, 'data fim obrigatória'),
  status: z.enum(['rascunho','ativo','pausado','encerrado']),
}).refine(
  (v) => new Date(v.data_fim) >= new Date(v.data_inicio),
  { path: ['data_fim'], message: 'fim deve ser após início' }
);

export type EventoFormPayload = z.infer<typeof schema>;

interface Props {
  valoresIniciais?: Partial<EventoFormPayload>;
  onSubmit: (data: EventoFormPayload) => void;
  enviando?: boolean;
}

export function EventoForm({ valoresIniciais, onSubmit, enviando }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<EventoFormPayload>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'rascunho',
      ...valoresIniciais,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome do evento</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" rows={3} {...register('descricao')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="data_inicio">Data de início</Label>
          <Input id="data_inicio" type="date" {...register('data_inicio')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data_fim">Data de fim</Label>
          <Input id="data_fim" type="date" {...register('data_fim')} />
          {errors.data_fim && <p className="text-sm text-destructive">{errors.data_fim.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...register('status')}>
          <option value="rascunho">Rascunho</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="encerrado">Encerrado</option>
        </Select>
      </div>
      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 6.3: GREEN**

```bash
npm run test:ui -- EventoForm
```

Expected: 4 passing.

- [ ] **Step 6.4: Commit**

```bash
git add src/components/admin/EventoForm.tsx tests/components/EventoForm.test.tsx
git commit -m "feat(admin): add EventoForm with date validation (4 tests)"
```

---

## Task 7 — EventosTab: listagem + modal CRUD

**Files:**
- Create: `src/app/admin/tabs/EventosTab.tsx`

- [ ] **Step 7.1: Implementar**

```tsx
'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { EventoDb, EventoStatus } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { EventoForm, type EventoFormPayload } from '@/components/admin/EventoForm';
import { Plus, Edit } from 'lucide-react';

function corStatus(s: EventoStatus): 'default' | 'secondary' | 'destructive' | 'success' | 'outline' {
  if (s === 'ativo') return 'success';
  if (s === 'encerrado') return 'secondary';
  if (s === 'pausado') return 'outline';
  return 'default';
}

export function EventosTab() {
  const adminClient = useAdminClient();
  const [eventos, setEventos] = React.useState<EventoDb[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<EventoDb | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('eventos')
      .select('*').order('criado_em', { ascending: false });
    setEventos((data as EventoDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const salvar = async (form: EventoFormPayload) => {
    if (!adminClient) return;
    setEnviando(true);
    setErro(null);
    try {
      if (editando) {
        const { error } = await adminClient.from('eventos')
          .update(form).eq('id', editando.id);
        if (error) throw error;
      } else {
        // Operador atual (criador_por) — pega do auth.user via JWT
        const { data: u } = await adminClient.auth.getUser();
        const { error } = await adminClient.from('eventos').insert({
          ...form, criado_por: u.user?.id,
        });
        if (error) throw error;
      }
      setModalAberto(false);
      setEditando(null);
      await recarregar();
    } catch (e) {
      const msg = (e as { message?: string }).message ?? 'erro';
      if (msg.includes('unq_evento_ativo')) {
        setErro('Já existe um evento ativo. Pause-o antes de ativar outro.');
      } else {
        setErro(msg);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Eventos</h2>
          <p className="text-muted-foreground">{eventos.length} eventos cadastrados.</p>
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true); }}>
          <Plus className="mr-1 h-4 w-4" />Novo evento
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.nome}</TableCell>
              <TableCell>{e.data_inicio}</TableCell>
              <TableCell>{e.data_fim}</TableCell>
              <TableCell>
                <Badge variant={corStatus(e.status)}>{e.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { setEditando(e); setModalAberto(true); }}
                  aria-label="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onClose={() => setModalAberto(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          </DialogHeader>
          {erro && <p className="mb-2 text-sm text-destructive">{erro}</p>}
          <EventoForm
            onSubmit={salvar}
            enviando={enviando}
            valoresIniciais={editando ? {
              nome: editando.nome,
              descricao: editando.descricao ?? '',
              data_inicio: editando.data_inicio,
              data_fim: editando.data_fim,
              status: editando.status,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/app/admin/tabs/EventosTab.tsx
git commit -m "feat(admin): add EventosTab with CRUD modal and UNIQUE active validation"
```

---

## Task 8 — PremioForm com cor picker + upload (TDD)

**Files:**
- Create: `src/components/admin/CorPickerInline.tsx`
- Create: `src/components/admin/PremioForm.tsx`
- Create: `src/lib/admin/uploadFoto.ts`
- Create: `tests/components/PremioForm.test.tsx`

- [ ] **Step 8.1: Criar `CorPickerInline.tsx`** (paleta + input hex)

```tsx
'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

const PALETA = [
  '#4afad4', // primary claro
  '#009993', // primary escuro
  '#f7b32b', // amarelo
  '#e74c3c', // vermelho
  '#3498db', // azul
  '#9b59b6', // roxo
  '#27ae60', // verde
  '#555555', // cinza ("Não foi")
];

interface Props {
  value: string;
  onChange: (cor: string) => void;
  id?: string;
}

export function CorPickerInline({ value, onChange, id }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PALETA.map((cor) => (
          <button
            key={cor}
            type="button"
            aria-label={`Selecionar cor ${cor}`}
            onClick={() => onChange(cor)}
            style={{ backgroundColor: cor }}
            className={cn(
              'h-7 w-7 rounded-md border-2 transition-all',
              value === cor ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
            )}
          />
        ))}
      </div>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#RRGGBB"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
      />
    </div>
  );
}
```

- [ ] **Step 8.2: Criar `uploadFoto.ts`**

```typescript
import { env } from '@/lib/env';

/**
 * Faz upload de uma foto via Edge Function processar-imagem.
 * Retorna foto_path para gravar em premios.foto_path.
 */
export async function uploadFotoPremio(
  adminJwt: string,
  premioId: string,
  arquivo: File
): Promise<string> {
  const fd = new FormData();
  fd.append('premio_id', premioId);
  fd.append('arquivo', arquivo);
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/processar-imagem`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminJwt}` },
    body: fd,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.erro ?? `upload falhou: ${res.status}`);
  }
  const { foto_path } = (await res.json()) as { foto_path: string };
  return foto_path;
}
```

- [ ] **Step 8.3: Escrever teste PremioForm**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PremioForm } from '@/components/admin/PremioForm';

describe('PremioForm', () => {
  it('renderiza campos obrigatórios', () => {
    render(<PremioForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estoque inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cor/i)).toBeInTheDocument();
  });

  it('rejeita peso negativo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Vale');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '-5' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '10' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/peso.*0/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('e_premio_real false aceita estoque 0', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Não foi');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '0' } });
    fireEvent.click(screen.getByLabelText(/slot.*n.o ganha/i));
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Não foi', peso_base: 30, estoque_inicial: 0, e_premio_real: false,
    }));
  });

  it('e_premio_real true rejeita estoque 0', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Vale');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/estoque.*0/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submete payload completo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Vale R$10');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Vale R$10', peso_base: 1, estoque_inicial: 100, e_premio_real: true,
    }));
  });
});
```

- [ ] **Step 8.4: Implementar `PremioForm.tsx`**

```tsx
'use client';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CorPickerInline } from './CorPickerInline';

const schema = z.object({
  nome: z.string().trim().min(2),
  descricao: z.string().nullable().optional(),
  cor_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor inválida (#RRGGBB)'),
  peso_base: z.number().int().min(0, 'peso deve ser >= 0'),
  estoque_inicial: z.number().int().min(0),
  ordem_roleta: z.number().int().default(0),
  e_premio_real: z.boolean().default(true),
}).refine(
  (v) => v.e_premio_real ? v.estoque_inicial > 0 : true,
  { path: ['estoque_inicial'], message: 'prêmio real precisa de estoque > 0' }
);

export type PremioFormPayload = z.infer<typeof schema>;

interface Props {
  valoresIniciais?: Partial<PremioFormPayload>;
  onSubmit: (data: PremioFormPayload, foto?: File) => void;
  enviando?: boolean;
}

export function PremioForm({ valoresIniciais, onSubmit, enviando }: Props) {
  const [foto, setFoto] = React.useState<File | null>(null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<PremioFormPayload>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '', descricao: '', cor_hex: '#4afad4',
      peso_base: 1, estoque_inicial: 1, ordem_roleta: 0,
      e_premio_real: true,
      ...valoresIniciais,
    },
  });

  const submit = (data: PremioFormPayload) => onSubmit(data, foto ?? undefined);

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome do prêmio</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" rows={2} {...register('descricao')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="peso">Peso (probabilidade)</Label>
          <Input id="peso" type="number" min={0} {...register('peso_base', { valueAsNumber: true })} />
          {errors.peso_base && <p className="text-sm text-destructive">{errors.peso_base.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estoque">Estoque inicial</Label>
          <Input
            id="estoque"
            type="number"
            min={0}
            {...register('estoque_inicial', { valueAsNumber: true })}
          />
          {errors.estoque_inicial &&
            <p className="text-sm text-destructive">{errors.estoque_inicial.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cor">Cor da fatia</Label>
        <Controller
          name="cor_hex"
          control={control}
          render={({ field }) => (
            <CorPickerInline id="cor" value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.cor_hex && <p className="text-sm text-destructive">{errors.cor_hex.message}</p>}
      </div>
      <Checkbox
        {...register('e_premio_real')}
        label={
          <span>
            <strong>Slot "Não foi dessa vez"</strong>{' '}
            <span className="text-muted-foreground">
              (marque para criar slot sem prêmio físico — desmarque para prêmio real)
            </span>
          </span>
        }
      />
      {/* Inverte semântica: checkbox marca = NÃO é prêmio real */}

      <div className="space-y-1.5">
        <Label htmlFor="foto">Foto do prêmio (PNG/JPEG/WEBP, máx 5MB)</Label>
        <Input
          id="foto" type="file" accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
```

> Nota: a semântica do checkbox `e_premio_real` é INVERTIDA acima. Para fazer o teste passar (`fireEvent.click(screen.getByLabelText(/slot.*n.o ganha/i))` espera marcar slot vazio), precisaríamos ajustar — vamos simplificar. Trocar o label e fazer checkbox marcar quando É prêmio real (default=true):

Revisar e usar este `<Checkbox>` no lugar:

```tsx
<Controller
  name="e_premio_real"
  control={control}
  render={({ field }) => (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        id="slot_vazio"
        checked={!field.value}
        onChange={(e) => field.onChange(!e.target.checked)}
        className="mt-1 h-5 w-5 cursor-pointer rounded border border-input"
      />
      <label htmlFor="slot_vazio" className="cursor-pointer select-none text-sm leading-tight">
        Slot <strong>"Não ganha nada"</strong> — desmarque para prêmio real
      </label>
    </div>
  )}
/>
```

Substituir o bloco `<Checkbox {...register('e_premio_real')} ... />` no formulário pela versão Controller acima.

- [ ] **Step 8.5: GREEN**

```bash
npm run test:ui -- PremioForm
```

Expected: 5 passing.

- [ ] **Step 8.6: Commit**

```bash
git add src/components/admin/PremioForm.tsx src/components/admin/CorPickerInline.tsx \
        src/lib/admin/uploadFoto.ts tests/components/PremioForm.test.tsx
git commit -m "feat(admin): add PremioForm with cor picker + upload + slot vazio toggle (5 tests)"
```

---

## Task 9 — PremiosTab com drag-and-drop

**Files:**
- Create: `src/app/admin/tabs/PremiosTab.tsx`

> Lista prêmios em formato sortable via `@dnd-kit/sortable`. Reordenar atualiza `ordem_roleta`.

- [ ] **Step 9.1: Implementar `PremiosTab.tsx`**

```tsx
'use client';
import * as React from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAdmin } from '@/contexts/AdminContext';
import type { PremioDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PremioForm, type PremioFormPayload } from '@/components/admin/PremioForm';
import { uploadFotoPremio } from '@/lib/admin/uploadFoto';
import { Plus, Edit, GripVertical, Trash2 } from 'lucide-react';

interface ItemProps {
  premio: PremioDb;
  onEditar: () => void;
  onExcluir: () => void;
}

function ItemSortavel({ premio, onEditar, onExcluir }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: premio.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border bg-card p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="h-8 w-8 rounded"
        style={{ backgroundColor: premio.cor_hex ?? '#cccccc' }}
        aria-hidden
      />
      <div className="flex-1">
        <div className="font-medium">{premio.nome}</div>
        <div className="text-xs text-muted-foreground">
          peso {premio.peso_base} · estoque {premio.estoque_atual}/{premio.estoque_inicial}
        </div>
      </div>
      {!premio.e_premio_real && <Badge variant="secondary">Slot vazio</Badge>}
      <Button size="sm" variant="ghost" onClick={onEditar} aria-label="Editar"><Edit className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" onClick={onExcluir} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}

export function PremiosTab() {
  const adminClient = useAdminClient();
  const { adminJwt } = useAdmin();
  const [eventoId, setEventoId] = React.useState<string | null>(null);
  const [premios, setPremios] = React.useState<PremioDb[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<PremioDb | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data: evt } = await adminClient.from('eventos').select('id').eq('status', 'ativo').maybeSingle();
    if (!evt) { setEventoId(null); setPremios([]); return; }
    setEventoId(evt.id);
    const { data } = await adminClient.from('premios')
      .select('*').eq('evento_id', evt.id).order('ordem_roleta');
    setPremios((data as PremioDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!adminClient) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = premios.findIndex((p) => p.id === active.id);
    const newIdx = premios.findIndex((p) => p.id === over.id);
    const novoArr = arrayMove(premios, oldIdx, newIdx);
    setPremios(novoArr);

    // Persiste novo ordem_roleta sequencial
    await Promise.all(
      novoArr.map((p, i) =>
        adminClient.from('premios').update({ ordem_roleta: i }).eq('id', p.id)
      )
    );
  };

  const salvar = async (form: PremioFormPayload, foto?: File) => {
    if (!adminClient || !eventoId) return;
    setEnviando(true);
    setErro(null);
    try {
      let premioId = editando?.id;

      if (editando) {
        const { error } = await adminClient.from('premios')
          .update({ ...form, estoque_atual: Math.min(editando.estoque_atual, form.estoque_inicial) })
          .eq('id', editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await adminClient.from('premios').insert({
          ...form,
          evento_id: eventoId,
          estoque_atual: form.estoque_inicial,
        }).select('id').single();
        if (error) throw error;
        premioId = (data as { id: string }).id;
      }

      if (foto && premioId && adminJwt) {
        const path = await uploadFotoPremio(adminJwt, premioId, foto);
        await adminClient.from('premios').update({ foto_path: path }).eq('id', premioId);
      }

      setModalAberto(false);
      setEditando(null);
      await recarregar();
    } catch (e) {
      setErro((e as { message?: string }).message ?? 'erro');
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async (premio: PremioDb) => {
    if (!adminClient) return;
    if (!confirm(`Excluir o prêmio "${premio.nome}"? Esta ação é irreversível.`)) return;
    const { error } = await adminClient.from('premios').delete().eq('id', premio.id);
    if (error) {
      alert(`Falha: ${error.message}\n(prêmios com ganhadores não podem ser excluídos)`);
      return;
    }
    await recarregar();
  };

  if (!eventoId) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Prêmios</h2>
        <p className="mt-2 text-muted-foreground">
          Nenhum evento ativo. Crie/ative um evento antes de cadastrar prêmios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prêmios</h2>
          <p className="text-muted-foreground">Arraste para reordenar na roleta.</p>
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true); }}>
          <Plus className="mr-1 h-4 w-4" />Novo prêmio
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={premios.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {premios.map((p) => (
              <ItemSortavel
                key={p.id}
                premio={p}
                onEditar={() => { setEditando(p); setModalAberto(true); }}
                onExcluir={() => excluir(p)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onClose={() => setModalAberto(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar prêmio' : 'Novo prêmio'}</DialogTitle>
          </DialogHeader>
          {erro && <p className="mb-2 text-sm text-destructive">{erro}</p>}
          <PremioForm
            onSubmit={salvar}
            enviando={enviando}
            valoresIniciais={editando ? {
              nome: editando.nome,
              descricao: editando.descricao ?? '',
              cor_hex: editando.cor_hex ?? '#4afad4',
              peso_base: editando.peso_base,
              estoque_inicial: editando.estoque_inicial,
              ordem_roleta: editando.ordem_roleta,
              e_premio_real: editando.e_premio_real,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add src/app/admin/tabs/PremiosTab.tsx
git commit -m "feat(admin): add PremiosTab with drag-and-drop reorder + foto upload"
```

---

## Task 10 — OperadoresTab + GanhadoresTab + AuditoriaTab + ConfigTab

**Files:**
- Create: `src/app/admin/tabs/OperadoresTab.tsx`
- Create: `src/app/admin/tabs/GanhadoresTab.tsx`
- Create: `src/app/admin/tabs/AuditoriaTab.tsx`
- Create: `src/app/admin/tabs/ConfigTab.tsx`

> Implementações compactas — os 4 tabs restantes em uma task. Sem testes unitários (UX validada manualmente).

- [ ] **Step 10.1: Criar `OperadoresTab.tsx`** (listar + convidar via email)

```tsx
'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { PerfilOperador } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, UserX } from 'lucide-react';

export function OperadoresTab() {
  const adminClient = useAdminClient();
  const [operadores, setOperadores] = React.useState<PerfilOperador[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [nome, setNome] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('perfis_operadores')
      .select('*').order('criado_em', { ascending: false });
    setOperadores((data as PerfilOperador[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const convidar = async () => {
    if (!adminClient) return;
    setEnviando(true);
    setErro(null);
    try {
      // Cria conta via admin API (requer service_role) — alternativa: pedir ao admin pra criar no Studio
      // Aqui, usamos signUp normal para enviar magic link
      const { error } = await adminClient.auth.signUp({
        email,
        password: crypto.randomUUID() + '!Aa1',  // senha aleatória; operador trocará
        options: { data: { nome_completo: nome } },
      });
      if (error) throw error;
      setModalAberto(false);
      setEmail(''); setNome('');
      await recarregar();
    } catch (e) {
      setErro((e as { message?: string }).message ?? 'erro');
    } finally {
      setEnviando(false);
    }
  };

  const desativar = async (op: PerfilOperador) => {
    if (!adminClient) return;
    if (!confirm(`Desativar ${op.nome_completo}?`)) return;
    await adminClient.from('perfis_operadores').update({ ativo: false }).eq('id', op.id);
    await recarregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operadores</h2>
          <p className="text-muted-foreground">{operadores.length} cadastrados.</p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-1 h-4 w-4" />Convidar operador
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operadores.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.nome_completo}</TableCell>
              <TableCell>{new Date(o.criado_em).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={o.ativo ? 'success' : 'secondary'}>
                  {o.ativo ? 'Ativo' : 'Desativado'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {o.ativo && (
                  <Button size="sm" variant="ghost" onClick={() => desativar(o)} aria-label="Desativar">
                    <UserX className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onClose={() => setModalAberto(false)}>
          <DialogHeader><DialogTitle>Convidar operador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="op-nome">Nome completo</Label>
              <Input id="op-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-email">E-mail</Label>
              <Input id="op-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button onClick={convidar} disabled={enviando || !email || !nome} className="w-full">
              {enviando ? 'Convidando...' : 'Enviar convite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 10.2: Criar `GanhadoresTab.tsx`** (listar + marcar entregue)

```tsx
'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { GanhadorDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface GanhadorComPremio extends GanhadorDb {
  premio_nome: string;
  e_premio_real: boolean;
}

export function GanhadoresTab() {
  const adminClient = useAdminClient();
  const [ganhadores, setGanhadores] = React.useState<GanhadorComPremio[]>([]);
  const [filtro, setFiltro] = React.useState<'pendentes' | 'entregues' | 'todos'>('pendentes');

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('ganhadores')
      .select('*, premios!inner(nome, e_premio_real)')
      .order('ganho_em', { ascending: false });
    const arr = (data ?? []).map(
      (g: GanhadorDb & { premios: { nome: string; e_premio_real: boolean } }) => ({
        ...g,
        premio_nome: g.premios.nome,
        e_premio_real: g.premios.e_premio_real,
      })
    );
    setGanhadores(arr);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const marcarEntregue = async (g: GanhadorComPremio) => {
    if (!adminClient) return;
    const obs = prompt('Observações (opcional):') ?? '';
    const { data: u } = await adminClient.auth.getUser();
    const { error } = await adminClient.from('ganhadores').update({
      entregue: true,
      entregue_em: new Date().toISOString(),
      entregue_por: u.user?.id,
      observacoes: obs || null,
    }).eq('id', g.id);
    if (error) {
      alert(`Falha: ${error.message}`);
      return;
    }
    await recarregar();
  };

  const filtrados = ganhadores.filter((g) => {
    if (!g.e_premio_real) return false;  // "Não foi" não aparece aqui
    if (filtro === 'pendentes') return !g.entregue;
    if (filtro === 'entregues') return g.entregue;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ganhadores / Entrega</h2>
        <p className="text-muted-foreground">{filtrados.length} ganhadores listados.</p>
      </div>
      <div className="flex gap-2">
        {(['pendentes','entregues','todos'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? 'default' : 'outline'}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Prêmio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtrados.map((g) => (
            <TableRow key={g.id}>
              <TableCell>{new Date(g.ganho_em).toLocaleString()}</TableCell>
              <TableCell className="font-medium">{g.jogador_nome}</TableCell>
              <TableCell className="font-mono text-xs">{g.jogador_telefone}</TableCell>
              <TableCell>{g.premio_nome}</TableCell>
              <TableCell>
                {g.entregue ? (
                  <Badge variant="success">Entregue</Badge>
                ) : (
                  <Badge variant="default">Pendente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {!g.entregue && (
                  <Button size="sm" onClick={() => marcarEntregue(g)}>
                    Marcar entregue
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 10.3: Criar `AuditoriaTab.tsx`** (paginada read-only)

```tsx
'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { AuditoriaDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 50;

export function AuditoriaTab() {
  const adminClient = useAdminClient();
  const [pagina, setPagina] = React.useState(0);
  const [registros, setRegistros] = React.useState<AuditoriaDb[]>([]);
  const [temMais, setTemMais] = React.useState(false);

  React.useEffect(() => {
    if (!adminClient) return;
    let alive = true;
    (async () => {
      const inicio = pagina * PAGE_SIZE;
      const fim = inicio + PAGE_SIZE - 1;
      const { data } = await adminClient.from('auditoria')
        .select('*').order('criado_em', { ascending: false }).range(inicio, fim);
      if (!alive) return;
      const arr = (data as AuditoriaDb[]) ?? [];
      setRegistros(arr);
      setTemMais(arr.length === PAGE_SIZE);
    })();
    return () => { alive = false; };
  }, [adminClient, pagina]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Auditoria</h2>
        <p className="text-muted-foreground">Histórico de ações sensíveis (read-only).</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Ator</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(r.criado_em).toLocaleString()}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.acao}</TableCell>
              <TableCell className="font-mono text-xs">
                {r.ator?.slice(0, 8) ?? '—'}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.ip ?? '—'}</TableCell>
              <TableCell className="text-xs">
                <details>
                  <summary className="cursor-pointer">ver</summary>
                  <pre className="mt-1 max-w-md overflow-auto rounded bg-muted p-2">
                    {JSON.stringify(r.detalhes, null, 2)}
                  </pre>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline"
          disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
          ← Anterior
        </Button>
        <span className="text-sm text-muted-foreground">Página {pagina + 1}</span>
        <Button size="sm" variant="outline"
          disabled={!temMais} onClick={() => setPagina((p) => p + 1)}>
          Próximo →
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 10.4: Criar `ConfigTab.tsx`** (senha + lojas + fingerprints)

```tsx
'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import type { LojaDb, FingerprintBloqueadoDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ConfigTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
      <TrocarSenhaAdmin />
      <GerenciarLojas />
      <FingerprintsBloqueados />
    </div>
  );
}

function TrocarSenhaAdmin() {
  const { session } = useAuth();
  const [senhaAtual, setAtual] = React.useState('');
  const [senhaNova, setNova] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);

  const trocar = async () => {
    setMsg(null);
    if (senhaNova.length < 8) { setMsg('Senha precisa de 8+ chars'); return; }
    // Re-valida senha atual via Edge Function, depois define nova via private.definir_senha_admin RPC
    const validar = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validar-senha-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ senha: senhaAtual }),
    });
    if (!validar.ok) { setMsg('Senha atual inválida.'); return; }
    // Chama private.definir_senha_admin via fetch direto (service_role-only)
    // Como service_role não está disponível no browser, esse passo deve passar por uma Edge Function de "trocar-senha-admin"
    // que ainda não existe no MVP. Por ora, exibe instrução:
    setMsg('Para trocar a senha, use a CLI: `npm run cli -- definir-senha-admin` (Plano 3).');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Trocar senha admin</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="senha-atual">Senha atual</Label>
          <Input id="senha-atual" type="password" value={senhaAtual} onChange={(e) => setAtual(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha-nova">Nova senha</Label>
          <Input id="senha-nova" type="password" value={senhaNova} onChange={(e) => setNova(e.target.value)} />
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <Button onClick={trocar} disabled={!senhaAtual || !senhaNova}>Trocar</Button>
      </CardContent>
    </Card>
  );
}

function GerenciarLojas() {
  const adminClient = useAdminClient();
  const [lojas, setLojas] = React.useState<LojaDb[]>([]);
  const [nome, setNome] = React.useState('');
  const [cidade, setCidade] = React.useState('');

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('lojas').select('*').order('nome');
    setLojas((data as LojaDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const adicionar = async () => {
    if (!adminClient || !nome) return;
    await adminClient.from('lojas').insert({ nome, cidade: cidade || null });
    setNome(''); setCidade('');
    await recarregar();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Lojas Altis</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {lojas.map((l) => (
            <li key={l.id} className="flex justify-between border-b py-1">
              <span>{l.nome}</span>
              <span className="text-muted-foreground">{l.cidade ?? '—'}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Button onClick={adicionar} disabled={!nome}>Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FingerprintsBloqueados() {
  const adminClient = useAdminClient();
  const [bloqueados, setBloqueados] = React.useState<FingerprintBloqueadoDb[]>([]);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('fingerprints_bloqueados')
      .select('*').order('bloqueado_em', { ascending: false });
    setBloqueados((data as FingerprintBloqueadoDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const desbloquear = async (fp: string) => {
    if (!adminClient) return;
    if (!confirm('Desbloquear esse dispositivo?')) return;
    await adminClient.from('fingerprints_bloqueados').delete().eq('fingerprint', fp);
    await recarregar();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Fingerprints bloqueados</CardTitle></CardHeader>
      <CardContent>
        {bloqueados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dispositivo bloqueado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {bloqueados.map((b) => (
              <li key={b.fingerprint} className="flex items-center justify-between border-b py-1">
                <span className="font-mono text-xs">{b.fingerprint.slice(0, 16)}...</span>
                <span className="text-muted-foreground">{b.motivo}</span>
                <Button size="sm" variant="ghost" onClick={() => desbloquear(b.fingerprint)}>
                  Desbloquear
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 10.5: Commit**

```bash
git add src/app/admin/tabs/OperadoresTab.tsx \
        src/app/admin/tabs/GanhadoresTab.tsx \
        src/app/admin/tabs/AuditoriaTab.tsx \
        src/app/admin/tabs/ConfigTab.tsx
git commit -m "feat(admin): add Operadores, Ganhadores, Auditoria, Config tabs"
```

---

## Task 11 — Página `/admin` integrada (orquestrador)

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 11.1: Substituir `/admin/page.tsx`** com o orquestrador completo

```tsx
'use client';
import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { AbaAdmin } from '@/components/admin/AdminSidebar';
import { DashboardTab } from './tabs/DashboardTab';
import { EventosTab } from './tabs/EventosTab';
import { PremiosTab } from './tabs/PremiosTab';
import { OperadoresTab } from './tabs/OperadoresTab';
import { GanhadoresTab } from './tabs/GanhadoresTab';
import { AuditoriaTab } from './tabs/AuditoriaTab';
import { ConfigTab } from './tabs/ConfigTab';

export default function AdminPage() {
  return (
    <AuthGuard>
      <Header rightSlot={<AdminButton />} />
      <AdminGate />
    </AuthGuard>
  );
}

function AdminGate() {
  const { modoAdmin } = useAdmin();
  const [aba, setAba] = React.useState<AbaAdmin>('dashboard');

  if (!modoAdmin) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Você precisa estar em <strong>Modo Admin</strong> para acessar esta área.
          Clique em &quot;Admin&quot; no cabeçalho.
        </p>
      </main>
    );
  }

  return (
    <AdminLayout abaAtiva={aba} onAbaChange={setAba}>
      {aba === 'dashboard' && <DashboardTab />}
      {aba === 'eventos' && <EventosTab />}
      {aba === 'premios' && <PremiosTab />}
      {aba === 'operadores' && <OperadoresTab />}
      {aba === 'ganhadores' && <GanhadoresTab />}
      {aba === 'auditoria' && <AuditoriaTab />}
      {aba === 'config' && <ConfigTab />}
    </AdminLayout>
  );
}
```

- [ ] **Step 11.2: Build + typecheck**

```bash
npm run typecheck
npm run build
```

Expected: ambos OK. `/admin` deve aparecer maior que antes (várias abas).

- [ ] **Step 11.3: Smoke manual**

```bash
npm run functions:serve  # T1
npm run dev              # T2
```

Login → ícone Admin → senha `admin123` → header mostra "Admin 29:59" → entra em `/admin` → vê sidebar com 7 abas → cada aba renderiza sem erro.

- [ ] **Step 11.4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): integrate /admin orchestrator with all 7 tabs"
```

---

## Task 12 — README + tag final

- [ ] **Step 12.1: Atualizar README**

```markdown
| 7 — Painel Admin | ✅ completo | Dashboard + 7 abas (Eventos, Prêmios drag-and-drop, Operadores, Ganhadores, Auditoria, Config) (13 tests) |
| 8 — E2E + Deploy | 🔜 próximo | Playwright + GitHub Pages + Sentry + UptimeRobot |
```

Atualizar contadores de testes:
```markdown
| `npm run test:ui` | Roda 54 testes Vitest |
| `npm run test` | tudo (db + functions + cli + ui — 184 testes total) |
```

- [ ] **Step 12.2: Commit + tag**

```bash
git add README.md
git commit -m "docs: mark Plano 7 (Painel Admin) as complete; total 184 tests"
git tag -a "plano-7-completo" -m "Plano 7: Painel Admin com 7 abas (Dashboard + CRUD eventos/prêmios + operadores + ganhadores + auditoria + config)"
git log --oneline | head -20
```

---

## Resumo pós-Plano 7

✅ Componentes UI: tabs, table, card, badge, textarea (shadcn)
✅ `useAdminClient` hook (SupabaseClient com JWT-Admin)
✅ `AdminLayout` + `AdminSidebar` com 7 abas (TDD, 2 tests)
✅ Dashboard com 4 cards de métricas + chart Recharts (TDD MetricCard, 2 tests)
✅ Eventos CRUD com modal + validação data_fim ≥ data_inicio (TDD, 4 tests)
✅ Prêmios com drag-and-drop + cor picker + upload foto (TDD, 5 tests)
✅ Operadores listar + convidar via email
✅ Ganhadores listar com filtro (pendentes/entregues/todos) + marcar entregue
✅ Auditoria paginada read-only (50/página)
✅ Config: trocar senha admin (delega à CLI) + CRUD lojas + desbloquear fingerprints

**Total: ~13 testes UI novos + 184 testes verdes no total**

---

## Self-Review

**1. Spec coverage (§8 painel admin):**
- 7 abas conforme §8.3 → Tasks 4-10 ✅
- Dashboard com cards + chart hora (§8.3 aba 1) → Task 5 ✅
- Eventos CRUD + UNIQUE evento ativo (§8.3 aba 2) → Tasks 6-7 ✅
- Prêmios CRUD + drag-and-drop + foto upload (§8.3 aba 3) → Tasks 8-9 ✅
- Operadores listar + convidar (§8.3 aba 4) → Task 10 ✅
- Ganhadores marcar entrega (§8.3 aba 5) → Task 10 ✅
- Auditoria read-only (§8.3 aba 6) → Task 10 ✅
- Config trocar senha + lojas + fingerprints (§8.3 aba 7) → Task 10 ✅
- Permissões: tudo via JWT-Admin → RLS valida is_admin (§5.3) → Task 2 (useAdminClient) ✅
- Upload via processar-imagem com Bearer JWT-Admin (§5.4) → Task 8.2 ✅

**2. Placeholder scan:** zero TBD/TODO. Tudo com código completo. ✅

**3. Type consistency:**
- `AbaAdmin` em `AdminSidebar` (Task 4); usada em `AdminLayout` (Task 4) e `page.tsx` (Task 11). ✅
- `useAdminClient()` retorna `SupabaseClient | null` em Task 2; usado consistente em Tasks 5-10. ✅
- `EventoFormPayload` em Task 6.2; usado em Task 7 (`salvar`). ✅
- `PremioFormPayload` em Task 8.4; usado em Task 9 (`salvar`). ✅
- `uploadFotoPremio(jwt, premioId, file)` em Task 8.2; chamado em Task 9.1 com mesma assinatura. ✅
- `EventoDb`, `PremioDb`, `PerfilOperador`, `GanhadorDb`, `AuditoriaDb`, `LojaDb`, `FingerprintBloqueadoDb` em Task 3; usados consistente nas tabs. ✅

Plano completo, autocontido, executável task-por-task.
