# Altis Bet — Plano 4: UI Foundation (Login + Welcome + Modal Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap o frontend Next.js 15 do Altis Bet com **shadcn/ui + Tailwind + paleta Altis (`#4afad4`/`#009993`)**, autenticação Supabase de operadores, **tela de Login**, **tela de Boas-vindas** (Roleta/Dados + ícone admin) e **modal de senha admin** que consome a Edge Function `validar-senha-admin` do Plano 2. Tela `/totem` fica como rota stub (Plano 5 implementa).

**Architecture:** Next.js 15 App Router em modo `output: 'export'` (estático) para deploy futuro no GitHub Pages. Tailwind + shadcn/ui (componentes copiados-no-projeto sobre Radix). Auth do operador via Supabase JS client (anon key + login email/senha → JWT em cookie HttpOnly via supabase-js session). Modo admin gerenciado por contexto React em memória (não localStorage); JWT-Admin expira 30min e re-pede senha. Testes: Vitest + Testing Library + happy-dom para componentes.

**Tech Stack:** Next.js 15.x (App Router), React 19, TypeScript 5.4, **Tailwind CSS 4** (ou 3.4 com config tradicional — usaremos 3.4 por compatibilidade shadcn), **shadcn/ui** (`button`, `input`, `dialog`, `form`, `label`, `sonner`), lucide-react, react-hook-form 7 + zod 3, next-themes 0.3, @supabase/supabase-js 2.45, Vitest 1.6 + @testing-library/react 16 + happy-dom 15.

**Pré-requisitos atendidos:**
- Plano 1: schema, RLS, sortear, seed com operador `dev@altis.local` (`senha123`)
- Plano 2: Edge Function `validar-senha-admin` rodando em `:54321/functions/v1/`
- Plano 3: CLI funcional para setup
- Tag `plano-3-completo` no git

**Tempo estimado:** ~10–14 horas se executado sequencialmente.

---

## File structure que este plano cria

```
altis-bet/
├─ package.json                              # MODIFY: deps Next.js + scripts
├─ tsconfig.json                             # MODIFY: adicionar paths/jsx
├─ next.config.mjs                           # NEW: output: export, basePath
├─ tailwind.config.ts                        # NEW: paleta Altis + shadcn
├─ postcss.config.mjs                        # NEW
├─ components.json                           # NEW: shadcn/ui config
├─ public/
│  ├─ logo.svg                               # COPIADO de C:\Users\Altis\Documents\Logo\
│  ├─ altis-animacao.gif                     # COPIADO idem
│  └─ favicon.ico                            # placeholder
├─ src/app/
│  ├─ layout.tsx                             # raiz: ThemeProvider + AuthProvider + Toaster
│  ├─ globals.css                            # Tailwind base + shadcn variables
│  ├─ page.tsx                               # / (welcome) — Roleta/Dados + ícone admin
│  ├─ login/
│  │  └─ page.tsx                            # /login
│  ├─ totem/
│  │  └─ page.tsx                            # /totem — stub (Plano 5 implementa)
│  └─ admin/
│     └─ page.tsx                            # /admin — stub (Plano 6)
├─ src/components/
│  ├─ ui/                                    # shadcn/ui gerados (button, input, dialog, ...)
│  ├─ auth/
│  │  ├─ AuthGuard.tsx                       # redireciona pra /login se não autenticado
│  │  ├─ LoginForm.tsx                       # form com react-hook-form + zod
│  │  └─ UserMenu.tsx                        # header (nome + sair)
│  ├─ admin/
│  │  ├─ AdminModal.tsx                      # modal de senha + chamada à Edge Function
│  │  └─ AdminBadge.tsx                      # badge "🛡 Modo Admin 29:42"
│  ├─ theme/
│  │  ├─ ThemeProvider.tsx                   # next-themes wrapper
│  │  └─ ThemeToggle.tsx                     # botão sol/lua
│  ├─ home/
│  │  └─ GameCard.tsx                        # card de Roleta/Dados
│  ├─ Header.tsx                             # logo + UserMenu + AdminBadge + ThemeToggle
│  └─ LogoAltis.tsx                          # <img src="/logo.svg">
├─ src/contexts/
│  ├─ AuthContext.tsx                        # useAuth hook + provider
│  └─ AdminContext.tsx                       # useAdmin hook + provider (JWT-Admin em memória)
├─ src/lib/
│  ├─ supabase/
│  │  └─ browser.ts                          # createBrowserClient (anon + session)
│  ├─ env.ts                                 # validação de NEXT_PUBLIC_* (zod)
│  └─ utils.ts                               # cn() do shadcn
├─ tests/components/
│  ├─ setup.ts                               # happy-dom + jest-dom matchers
│  ├─ LoginForm.test.tsx                     # 4 tests
│  ├─ AuthGuard.test.tsx                     # 3 tests
│  ├─ AdminModal.test.tsx                    # 5 tests
│  └─ GameCard.test.tsx                      # 2 tests
└─ .github/workflows/
   └─ ci-ui.yml                              # NEW
```

---

## Convenções

- **TDD** quando o componente tem lógica testável (forms, guards, modal); **post-code tests** para componentes puramente visuais (LogoAltis, ThemeToggle).
- Commits em conventional commits.
- `src/_placeholder.ts` do Plano 1 será **removido** (substituído por código real).
- Paleta Altis no Tailwind: `primary` = `#4afad4` (light) / `#009993` (dark); texto sobre primary em light usa `#0d5d56` (atende WCAG AA 4.5:1).
- Cliente Supabase no browser usa **anon key** + persistência de sessão via `localStorage` (padrão do supabase-js). Operadores logados ficam autenticados entre refreshes.

---

## Task 1 — Inicializar Next.js 15 + remover placeholder TS

**Files:**
- Modify: `package.json` (deps Next, React, scripts)
- Create: `next.config.mjs`
- Modify: `tsconfig.json` (jsx, paths)
- Delete: `src/_placeholder.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1.1: Atualizar `package.json`**

```json
{
  "name": "altis-bet",
  "version": "0.4.0",
  "private": true,
  "engines": { "node": ">=20.0.0", "npm": ">=10.0.0" },
  "bin": { "altis-bet": "./cli/bin/altis-bet.ts" },
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status",
    "test:db": "supabase test db",
    "functions:serve": "supabase functions serve --no-verify-jwt --env-file supabase/.env.local",
    "test:functions": "vitest run tests/edge-functions",
    "test:cli": "vitest run cli/tests",
    "test:ui": "vitest run tests/components",
    "test:ui:watch": "vitest tests/components",
    "test": "npm run test:db && npm run test:functions && npm run test:cli && npm run test:ui",
    "cli": "tsx cli/bin/altis-bet.ts",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "next-themes": "^0.3.0",
    "lucide-react": "^0.460.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "sonner": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.19.0",
    "vitest": "^1.6.0",
    "@vitest/ui": "^1.6.0",
    "jose": "^5.9.0",
    "dotenv": "^16.4.0",
    "commander": "^12.1.0",
    "@inquirer/prompts": "^7.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.1.0",
    "csv-parse": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss-animate": "^1.0.7",
    "happy-dom": "^15.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/user-event": "^14.5.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

- [ ] **Step 1.2: Criar `next.config.mjs`**

```javascript
const isProd = process.env.NODE_ENV === 'production';
const repo = 'altis-bet';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 1.3: Atualizar `tsconfig.json` (jsx + paths)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] },
    "types": ["node"]
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "cli/**/*.ts",
    "tests/**/*.ts",
    "tests/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", "dist", "build", "out", ".next", "cli/dist"]
}
```

- [ ] **Step 1.4: Deletar `src/_placeholder.ts`**

```bash
rm src/_placeholder.ts
```

- [ ] **Step 1.5: Criar `src/app/globals.css` (placeholder; shadcn vars vêm na Task 3)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 1.6: Criar `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altis Bet',
  description: 'Plataforma de jogos com premiação — Altis Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 1.7: Criar `src/app/page.tsx` (placeholder welcome — Task 9 substitui)**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Altis Bet</h1>
    </main>
  );
}
```

- [ ] **Step 1.8: Instalar deps + smoke**

```bash
npm install
npm run dev
```

Em outro terminal:
```bash
curl http://localhost:3000
```

Expected: HTML com "Altis Bet". Encerrar `npm run dev` com Ctrl+C.

- [ ] **Step 1.9: Build estático funciona**

```bash
npm run build
ls out/
```

Expected: pasta `out/` com `index.html`, assets, etc.

- [ ] **Step 1.10: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs src/
git rm src/_placeholder.ts || true
git commit -m "chore(ui): bootstrap Next.js 15 + App Router + static export"
```

---

## Task 2 — Tailwind CSS + paleta Altis

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Modify: `src/app/globals.css` (variáveis HSL para shadcn)

- [ ] **Step 2.1: Criar `postcss.config.mjs`**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 2.2: Criar `tailwind.config.ts`**

Paleta Altis convertida pra HSL (necessário para shadcn theming):
- Primary light `#4afad4` ≈ `hsl(169 94% 64%)`
- Primary dark `#009993` ≈ `hsl(177 100% 30%)`

```typescript
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/contexts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:  'hsl(var(--primary))',
          foreground:'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:  'hsl(var(--secondary))',
          foreground:'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:  'hsl(var(--destructive))',
          foreground:'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:  'hsl(var(--muted))',
          foreground:'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:  'hsl(var(--accent))',
          foreground:'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:  'hsl(var(--popover))',
          foreground:'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:  'hsl(var(--card))',
          foreground:'hsl(var(--card-foreground))',
        },
        altis: {
          claro:  '#4afad4',
          escuro: '#009993',
          texto:  '#0d5d56',  // contraste WCAG AA sobre primary claro
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
};
export default config;
```

- [ ] **Step 2.3: Substituir `src/app/globals.css` (variáveis HSL claro + escuro)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 169 94% 64%;             /* #4afad4 */
    --primary-foreground: 175 75% 21%;  /* #0d5d56 — contraste 4.5:1 */
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 169 94% 90%;
    --accent-foreground: 175 75% 21%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 169 94% 64%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 47% 8%;
    --foreground: 210 40% 98%;
    --card: 222 47% 11%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 11%;
    --popover-foreground: 210 40% 98%;
    --primary: 177 100% 30%;            /* #009993 */
    --primary-foreground: 210 40% 98%;
    --secondary: 217 32% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 32% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 177 100% 20%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62% 30%;
    --destructive-foreground: 210 40% 98%;
    --border: 217 32% 17%;
    --input: 217 32% 17%;
    --ring: 177 100% 30%;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}
```

- [ ] **Step 2.4: Validar build + smoke**

```bash
npm run dev
```

Acessar `http://localhost:3000` — fundo branco/preto conforme `prefers-color-scheme`. Encerrar `Ctrl+C`.

- [ ] **Step 2.5: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs src/app/globals.css
git commit -m "feat(ui): configure tailwind with altis palette and shadcn css variables"
```

---

## Task 3 — Instalar shadcn/ui components

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: vários em `src/components/ui/` (button, input, dialog, form, label, sonner)

> Como shadcn/ui é "copy in" e não package npm, vamos criar os componentes manualmente (sem rodar `npx shadcn add` para evitar precisar interativo no agente).

- [ ] **Step 3.1: Criar `components.json`** (referência futura)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib"
  }
}
```

- [ ] **Step 3.2: Criar `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3.3: Criar `src/components/ui/button.tsx`**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-14 rounded-md px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';
export { buttonVariants };
```

- [ ] **Step 3.4: Criar `src/components/ui/input.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

- [ ] **Step 3.5: Criar `src/components/ui/label.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
));
Label.displayName = 'Label';
```

- [ ] **Step 3.6: Criar `src/components/ui/dialog.tsx` (versão simplificada, sem @radix-ui)**

> Para evitar adicionar mais uma dep, vamos usar nativo `<dialog>` controlado por estado.

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
      onClick={(e) => e.currentTarget === e.target && onOpenChange(false)}
      onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
    >
      {children}
    </div>
  );
}

export function DialogContent({ className, children, onClose }: {
  className?: string; children: React.ReactNode; onClose: () => void;
}) {
  return (
    <div
      className={cn(
        'relative w-full max-w-md rounded-lg border bg-background p-6 shadow-lg animate-in zoom-in-95',
        className
      )}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-col space-y-1.5">{children}</div>;
}
export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold leading-none tracking-tight">{children}</h2>;
}
export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
```

- [ ] **Step 3.7: Validar typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3.8: Commit**

```bash
git add components.json src/lib/ src/components/ui/
git commit -m "feat(ui): add shadcn/ui base components (button, input, label, dialog) and cn util"
```

---

## Task 4 — Assets + ThemeProvider + Header

**Files:**
- Copy: `public/logo.svg`, `public/altis-animacao.gif`
- Create: `src/components/LogoAltis.tsx`
- Create: `src/components/theme/ThemeProvider.tsx`
- Create: `src/components/theme/ThemeToggle.tsx`
- Create: `src/components/Header.tsx`

- [ ] **Step 4.1: Copiar assets**

```bash
cp "C:/Users/Altis/Documents/Logo/logo.svg" public/logo.svg
cp "C:/Users/Altis/Documents/Logo/altis-animacao.gif" public/altis-animacao.gif
```

Verificar:
```bash
ls -la public/
```

- [ ] **Step 4.2: Criar `src/components/LogoAltis.tsx`**

```tsx
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function LogoAltis({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt="Altis Sistemas"
      width={size}
      height={size}
      className={cn('select-none', className)}
      priority
    />
  );
}
```

- [ ] **Step 4.3: Criar `src/components/theme/ThemeProvider.tsx`**

```tsx
'use client';
import * as React from 'react';
import { ThemeProvider as NextThemes } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
```

- [ ] **Step 4.4: Criar `src/components/theme/ThemeToggle.tsx`**

```tsx
'use client';
import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-10 w-10" />;

  const isDark = theme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Trocar para tema ${isDark ? 'claro' : 'escuro'}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

- [ ] **Step 4.5: Criar `src/components/Header.tsx`** (stub — User/Admin partes vêm Tasks 7-10)

```tsx
import Link from 'next/link';
import { LogoAltis } from './LogoAltis';
import { ThemeToggle } from './theme/ThemeToggle';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-3">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80">
        <LogoAltis size={36} />
        <span className="text-xl font-bold tracking-tight">Altis Bet</span>
      </Link>
      <nav className="flex items-center gap-2">
        <ThemeToggle />
      </nav>
    </header>
  );
}
```

- [ ] **Step 4.6: Atualizar `src/app/layout.tsx` para incluir ThemeProvider**

```tsx
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altis Bet',
  description: 'Plataforma de jogos com premiação — Altis Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4.7: Commit**

```bash
git add public/ src/components/ src/app/layout.tsx
git commit -m "feat(ui): add logo assets, theme provider with dark/light toggle, base header"
```

---

## Task 5 — Supabase browser client + env validation

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `.env.local.example` (atualizar)

- [ ] **Step 5.1: Criar `src/lib/env.ts`** (zod validação dos NEXT_PUBLIC_*)

```typescript
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
```

- [ ] **Step 5.2: Criar `src/lib/supabase/browser.ts`**

```typescript
'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
```

- [ ] **Step 5.3: Atualizar `.env.local.example`** — adicionar NEXT_PUBLIC_*

Substituir o conteúdo do arquivo existente:

```env
# Supabase local (defaults após `supabase start`)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Frontend Next.js — versão pública (vai pro bundle do browser)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Segredos da aplicação (gerados pela CLI no bootstrap — Plano 3)
SESSAO_JWT_SECRET=
BCRYPT_PEPPER=
```

- [ ] **Step 5.4: Criar `.env.local` real (para `npm run dev` rodar)**

```bash
echo "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321" >> .env.local
echo 'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' >> .env.local
```

`.env.local` já está gitignored.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/ .env.local.example
git commit -m "feat(ui): add browser supabase client and zod-validated env"
```

---

## Task 6 — AuthContext + useAuth

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Modify: `src/app/layout.tsx` (envolve com AuthProvider)

- [ ] **Step 6.1: Criar `src/contexts/AuthContext.tsx`**

```tsx
'use client';
import * as React from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabaseBrowserClient();
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) => {
      if (alive) setSession(sess);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  const signIn = React.useCallback(async (email: string, senha: string) => {
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(error.message);
  }, [sb]);

  const signOut = React.useCallback(async () => {
    await sb.auth.signOut();
  }, [sb]);

  const value = React.useMemo<AuthState>(
    () => ({ user: session?.user ?? null, session, loading, signIn, signOut }),
    [session, loading, signIn, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const v = React.useContext(AuthCtx);
  if (!v) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return v;
}
```

- [ ] **Step 6.2: Atualizar `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altis Bet',
  description: 'Plataforma de jogos com premiação — Altis Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6.3: Commit**

```bash
git add src/contexts/ src/app/layout.tsx
git commit -m "feat(ui): add AuthContext (Supabase signIn/signOut + session state)"
```

---

## Task 7 — Tests setup (Vitest + Testing Library) + LoginForm TDD

**Files:**
- Create: `tests/components/setup.ts`
- Modify: `vitest.config.ts` (configurar happy-dom + tsx)
- Create: `tests/components/LoginForm.test.tsx`
- Create: `src/components/auth/LoginForm.tsx`

- [ ] **Step 7.1: Atualizar `vitest.config.ts`** (suporte JSX/TSX + happy-dom para UI tests)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    include: [
      'tests/edge-functions/**/*.test.ts',
      'cli/tests/**/*.test.ts',
      'tests/components/**/*.test.{ts,tsx}',
    ],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    environmentMatchGlobs: [
      ['tests/components/**', 'happy-dom'],
      ['**', 'node'],
    ],
    setupFiles: [
      './tests/edge-functions/helpers/setup.ts',
      './tests/components/setup.ts',
    ],
  },
});
```

- [ ] **Step 7.2: Criar `tests/components/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock next/image para evitar warning sobre next.config
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string } & Record<string, unknown>) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => { cleanup(); });
```

- [ ] **Step 7.3: Escrever teste `tests/components/LoginForm.test.tsx` (RED)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    loading: false,
    user: null,
    session: null,
    signOut: vi.fn(),
  }),
}));

const mockSignIn = vi.fn();

describe('LoginForm', () => {
  it('renderiza inputs de email e senha', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/e-?mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('valida email obrigatório antes de submeter', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/e-?mail.*obrigat/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('chama signIn com credenciais válidas', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/e-?mail/i), 'dev@altis.local');
    await user.type(screen.getByLabelText(/senha/i), 'senha123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(mockSignIn).toHaveBeenCalledWith('dev@altis.local', 'senha123');
  });

  it('exibe mensagem de erro quando signIn rejeita', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/e-?mail/i), 'dev@altis.local');
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/credenciais/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.4: RED**

```bash
npm run test:ui -- LoginForm
```

Expected: 4 failing.

- [ ] **Step 7.5: Implementar `src/components/auth/LoginForm.tsx`**

```tsx
'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [erro, setErro] = React.useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setErro(null);
    try {
      await signIn(data.email, data.senha);
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha no login';
      // Mensagem amigável para credenciais erradas
      setErro(/invalid.*credential/i.test(msg) ? 'Credenciais inválidas.' : msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" type="password" autoComplete="current-password" {...register('senha')} />
        {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
      </div>

      {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 7.6: GREEN**

```bash
npm run test:ui -- LoginForm
```

Expected: 4 passing.

- [ ] **Step 7.7: Commit**

```bash
git add tests/components/ src/components/auth/LoginForm.tsx vitest.config.ts
git commit -m "feat(ui): add LoginForm with react-hook-form + zod (TDD, 4 tests)"
```

---

## Task 8 — `/login` page + AuthGuard

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/components/auth/AuthGuard.tsx`
- Create: `tests/components/AuthGuard.test.tsx`

- [ ] **Step 8.1: Criar `src/app/login/page.tsx`**

```tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { LogoAltis } from '@/components/LogoAltis';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoAltis size={56} />
          <h1 className="text-2xl font-bold tracking-tight">Altis Bet</h1>
          <p className="text-sm text-muted-foreground">Entre com sua conta de operador</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 8.2: Escrever teste `tests/components/AuthGuard.test.tsx` (RED)**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthGuard } from '@/components/auth/AuthGuard';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const useAuthMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('AuthGuard', () => {
  it('mostra loading enquanto carrega sessão', () => {
    useAuthMock.mockReturnValue({ loading: true, user: null, session: null });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
  });

  it('redireciona para /login quando sem sessão', async () => {
    replaceMock.mockClear();
    useAuthMock.mockReturnValue({ loading: false, user: null, session: null });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'));
  });

  it('renderiza children quando há sessão', () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: '1', email: 'a@b' },
      session: { access_token: 't' },
    });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    expect(screen.getByText('protegido')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.3: RED**

```bash
npm run test:ui -- AuthGuard
```

Expected: 3 failing.

- [ ] **Step 8.4: Implementar `src/components/auth/AuthGuard.tsx`**

```tsx
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}
```

- [ ] **Step 8.5: GREEN**

```bash
npm run test:ui -- AuthGuard
```

Expected: 3 passing.

- [ ] **Step 8.6: Commit**

```bash
git add src/app/login/ src/components/auth/AuthGuard.tsx tests/components/AuthGuard.test.tsx
git commit -m "feat(ui): add /login page and AuthGuard with redirect-when-unauth (3 tests)"
```

---

## Task 9 — Tela `/` (welcome) com Roleta/Dados + ícone admin

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/home/GameCard.tsx`
- Create: `src/components/auth/UserMenu.tsx`
- Modify: `src/components/Header.tsx` (incluir UserMenu)
- Create: `tests/components/GameCard.test.tsx`

- [ ] **Step 9.1: Criar `src/components/home/GameCard.tsx`**

```tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GameCardProps {
  href: string;
  icone: string;
  titulo: string;
  subtitulo: string;
  disabled?: boolean;
  badge?: string;
}

export function GameCard({ href, icone, titulo, subtitulo, disabled, badge }: GameCardProps) {
  const content = (
    <div
      className={cn(
        'group relative flex h-72 flex-col items-center justify-center rounded-2xl border-2 bg-card p-8 text-center shadow-sm transition-all',
        disabled
          ? 'cursor-not-allowed border-muted opacity-50'
          : 'border-primary/30 hover:border-primary hover:shadow-lg hover:scale-[1.02]'
      )}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      )}
      <div className="text-7xl" aria-hidden>{icone}</div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">{titulo}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>
      {!disabled && (
        <span className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Abrir Totem
        </span>
      )}
    </div>
  );

  if (disabled) return <div aria-disabled>{content}</div>;
  return <Link href={href} className="block">{content}</Link>;
}
```

- [ ] **Step 9.2: Escrever teste GameCard**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameCard } from '@/components/home/GameCard';

describe('GameCard', () => {
  it('renderiza título e link quando habilitado', () => {
    render(<GameCard href="/totem" icone="🎰" titulo="Roleta" subtitulo="de prêmios" />);
    expect(screen.getByText('Roleta')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/totem');
  });

  it('renderiza badge "em breve" quando desabilitado', () => {
    render(
      <GameCard href="/x" icone="🎲" titulo="Dados" subtitulo="da sorte"
        disabled badge="em breve" />
    );
    expect(screen.getByText(/em breve/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 9.3: Criar `src/components/auth/UserMenu.tsx`**

```tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function UserMenu() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
        <User className="h-4 w-4" />
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sair">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 9.4: Atualizar `src/components/Header.tsx`** (UserMenu + slot pro admin)

```tsx
import Link from 'next/link';
import { LogoAltis } from './LogoAltis';
import { ThemeToggle } from './theme/ThemeToggle';
import { UserMenu } from './auth/UserMenu';

export function Header({ rightSlot }: { rightSlot?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-3">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80">
        <LogoAltis size={36} />
        <span className="text-xl font-bold tracking-tight">Altis Bet</span>
      </Link>
      <nav className="flex items-center gap-2">
        {rightSlot}
        <ThemeToggle />
        <UserMenu />
      </nav>
    </header>
  );
}
```

- [ ] **Step 9.5: Atualizar `src/app/page.tsx`** (welcome real)

```tsx
'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/home/GameCard';
import { useAuth } from '@/contexts/AuthContext';
import { AdminButton } from '@/components/admin/AdminButton';

export default function HomePage() {
  return (
    <AuthGuard>
      <Header rightSlot={<AdminButton />} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Welcome />
      </main>
    </AuthGuard>
  );
}

function Welcome() {
  const { user } = useAuth();
  const nomeCurto = user?.email?.split('@')[0] ?? 'operador';
  return (
    <section>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {nomeCurto}</h1>
        <p className="mt-2 text-muted-foreground">Escolha um jogo para abrir o totem.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <GameCard href="/totem" icone="🎰" titulo="ROLETA DE PRÊMIOS" subtitulo="Sorteio ponderado em tempo real" />
        <GameCard href="/totem-dados" icone="🎲" titulo="DADOS DA SORTE" subtitulo="Em breve" disabled badge="em breve" />
      </div>
    </section>
  );
}
```

> Nota: importa `AdminButton` que será criado na Task 10. Por isso esse step **commitará após** Task 10 estar pronta.

- [ ] **Step 9.6: GREEN do GameCard test**

```bash
npm run test:ui -- GameCard
```

Expected: 2 passing.

(Não comitar agora — Task 10 vai criar `AdminButton` antes do commit conjunto.)

---

## Task 10 — AdminContext + AdminModal + AdminButton + AdminBadge (TDD)

**Files:**
- Create: `src/contexts/AdminContext.tsx`
- Create: `src/components/admin/AdminModal.tsx`
- Create: `src/components/admin/AdminButton.tsx`
- Create: `src/components/admin/AdminBadge.tsx`
- Create: `tests/components/AdminModal.test.tsx`

- [ ] **Step 10.1: Criar `src/contexts/AdminContext.tsx`**

```tsx
'use client';
import * as React from 'react';

interface AdminState {
  adminJwt: string | null;
  expiraEm: number | null;        // unix seconds
  modoAdmin: boolean;
  ativar: (jwt: string, exp: number) => void;
  desativar: () => void;
  segundosRestantes: number;
}

const AdminCtx = React.createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminJwt, setJwt] = React.useState<string | null>(null);
  const [expiraEm, setExp] = React.useState<number | null>(null);
  const [agora, setAgora] = React.useState<number>(() => Math.floor(Date.now() / 1000));

  // Countdown 1Hz para forçar re-render
  React.useEffect(() => {
    if (!expiraEm) return;
    const id = setInterval(() => setAgora(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [expiraEm]);

  // Auto-desativa quando expirar
  React.useEffect(() => {
    if (expiraEm && agora >= expiraEm) {
      setJwt(null);
      setExp(null);
    }
  }, [agora, expiraEm]);

  const ativar = React.useCallback((jwt: string, exp: number) => {
    setJwt(jwt);
    setExp(exp);
  }, []);
  const desativar = React.useCallback(() => {
    setJwt(null);
    setExp(null);
  }, []);

  const segundosRestantes = expiraEm ? Math.max(0, expiraEm - agora) : 0;
  const modoAdmin = adminJwt !== null && segundosRestantes > 0;

  const value = React.useMemo<AdminState>(
    () => ({ adminJwt, expiraEm, modoAdmin, ativar, desativar, segundosRestantes }),
    [adminJwt, expiraEm, modoAdmin, ativar, desativar, segundosRestantes]
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdmin(): AdminState {
  const v = React.useContext(AdminCtx);
  if (!v) throw new Error('useAdmin deve ser usado dentro de <AdminProvider>');
  return v;
}
```

- [ ] **Step 10.2: Atualizar `src/app/layout.tsx`** para incluir AdminProvider

```tsx
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altis Bet',
  description: 'Plataforma de jogos com premiação — Altis Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AuthProvider>
            <AdminProvider>{children}</AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 10.3: Escrever teste AdminModal (RED)**

`tests/components/AdminModal.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminModal } from '@/components/admin/AdminModal';

const ativarMock = vi.fn();
vi.mock('@/contexts/AdminContext', () => ({
  useAdmin: () => ({
    adminJwt: null, expiraEm: null, modoAdmin: false,
    ativar: ativarMock, desativar: vi.fn(), segundosRestantes: 0,
  }),
}));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  ativarMock.mockReset();
  global.fetch = fetchMock as any;
});

describe('AdminModal', () => {
  it('exibe input de senha quando open=true', () => {
    render(<AdminModal open={true} onOpenChange={vi.fn()} accessToken="tok" />);
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /desbloquear/i })).toBeInTheDocument();
  });

  it('chama Edge Function com Authorization Bearer', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'admin-jwt', exp: 9999999999 }),
    });
    const user = userEvent.setup();
    render(<AdminModal open={true} onOpenChange={vi.fn()} accessToken="operador-tok" />);
    await user.type(screen.getByLabelText(/senha/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /desbloquear/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[1].headers.Authorization).toBe('Bearer operador-tok');
    expect(JSON.parse(call[1].body)).toEqual({ senha: 'admin123' });
  });

  it('ao sucesso chama ativar(jwt, exp) e fecha modal', async () => {
    const onOpenChange = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'admin-jwt', exp: 9999999999 }),
    });
    const user = userEvent.setup();
    render(<AdminModal open={true} onOpenChange={onOpenChange} accessToken="tok" />);
    await user.type(screen.getByLabelText(/senha/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /desbloquear/i }));
    await waitFor(() => {
      expect(ativarMock).toHaveBeenCalledWith('admin-jwt', 9999999999);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('senha inválida exibe mensagem genérica', async () => {
    fetchMock.mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ erro: 'Senha inválida' }),
    });
    const user = userEvent.setup();
    render(<AdminModal open={true} onOpenChange={vi.fn()} accessToken="tok" />);
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: /desbloquear/i }));
    expect(await screen.findByText(/senha inv/i)).toBeInTheDocument();
    expect(ativarMock).not.toHaveBeenCalled();
  });

  it('429 mostra mensagem de rate-limit', async () => {
    fetchMock.mockResolvedValue({
      ok: false, status: 429,
      json: () => Promise.resolve({ erro: 'Muitas tentativas' }),
    });
    const user = userEvent.setup();
    render(<AdminModal open={true} onOpenChange={vi.fn()} accessToken="tok" />);
    await user.type(screen.getByLabelText(/senha/i), 'x');
    await user.click(screen.getByRole('button', { name: /desbloquear/i }));
    expect(await screen.findByText(/30 minutos/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10.4: RED**

```bash
npm run test:ui -- AdminModal
```

Expected: 5 failing.

- [ ] **Step 10.5: Implementar `src/components/admin/AdminModal.tsx`**

```tsx
'use client';
import * as React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Shield } from 'lucide-react';

export function AdminModal({
  open, onOpenChange, accessToken,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accessToken: string;
}) {
  const { ativar } = useAdmin();
  const [senha, setSenha] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validar-senha-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setErro('Muitas tentativas. Tente novamente em 30 minutos.');
        } else {
          setErro('Senha inválida.');
        }
        return;
      }
      const { token, exp } = (await res.json()) as { token: string; exp: number };
      ativar(token, exp);
      setSenha('');
      onOpenChange(false);
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Modo Administrador
          </DialogTitle>
          <DialogDescription>
            Esta área é restrita. Digite a senha de admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha-admin">Senha</Label>
            <Input
              id="senha-admin"
              type="password"
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
            />
          </div>

          {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}

          <p className="text-xs text-muted-foreground">
            ⚠ Após 5 tentativas falhas, o IP é bloqueado por 30min.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || senha.length === 0}>
              {enviando ? 'Verificando...' : 'Desbloquear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

> Nota: o titulo do Dialog precisa aceitar `className`. Ajuste no `dialog.tsx` (Task 3.6):

Atualizar `src/components/ui/dialog.tsx` — substituir o componente DialogTitle:

```tsx
export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>{children}</h2>;
}
```

- [ ] **Step 10.6: Criar `src/components/admin/AdminButton.tsx`**

```tsx
'use client';
import * as React from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { AdminModal } from './AdminModal';
import { AdminBadge } from './AdminBadge';

export function AdminButton() {
  const [open, setOpen] = React.useState(false);
  const { modoAdmin } = useAdmin();
  const { session } = useAuth();
  if (!session) return null;

  if (modoAdmin) return <AdminBadge />;
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Modo admin">
        <Shield className="mr-1 h-4 w-4" />
        Admin
      </Button>
      <AdminModal open={open} onOpenChange={setOpen} accessToken={session.access_token} />
    </>
  );
}
```

- [ ] **Step 10.7: Criar `src/components/admin/AdminBadge.tsx`**

```tsx
'use client';
import { ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';

function format(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function AdminBadge() {
  const { segundosRestantes, desativar } = useAdmin();
  return (
    <div className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium">
      <ShieldCheck className="h-4 w-4 text-primary" />
      <span>Admin {format(segundosRestantes)}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={desativar}
        aria-label="Sair do modo admin">
        <LogOut className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 10.8: GREEN**

```bash
npm run test:ui -- AdminModal
```

Expected: 5 passing.

- [ ] **Step 10.9: Smoke geral**

```bash
npm run dev
```

Acessar `http://localhost:3000`:
- Redireciona para `/login`
- Logar com `dev@altis.local` / `senha123`
- Volta para `/` e mostra "Bem-vindo, dev" + 2 cards + botão Admin
- Clica Admin → modal pede senha → digita `admin123` → badge "🛡 Admin 29:59" no header
- Tema toggle funciona (sol/lua canto direito)

Encerra com Ctrl+C.

- [ ] **Step 10.10: Commit conjunto Tasks 9+10**

```bash
git add src/app/page.tsx src/components/home/ src/components/auth/UserMenu.tsx \
        src/components/admin/ src/contexts/AdminContext.tsx tests/components/ \
        src/components/Header.tsx src/components/ui/dialog.tsx src/app/layout.tsx
git commit -m "feat(ui): add welcome page, GameCard, UserMenu, AdminContext, AdminModal (TDD, 7 tests)"
```

---

## Task 11 — `/totem` stub (placeholder pro Plano 5)

**Files:**
- Create: `src/app/totem/page.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 11.1: Criar `src/app/totem/page.tsx`**

```tsx
'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';

export default function TotemPage() {
  return (
    <AuthGuard>
      <Header rightSlot={<AdminButton />} />
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Totem</h1>
          <p className="mt-2 text-muted-foreground">Roleta 3D será implementada no Plano 5.</p>
        </div>
      </main>
    </AuthGuard>
  );
}
```

- [ ] **Step 11.2: Criar `src/app/admin/page.tsx`**

```tsx
'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdmin } from '@/contexts/AdminContext';

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
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <p className="mt-2 text-muted-foreground">Conteúdo do painel será implementado no Plano 6.</p>
    </main>
  );
}
```

- [ ] **Step 11.3: Smoke + build**

```bash
npm run build
```

Expected: build completa sem erro, gera `out/` com `index.html`, `login/`, `totem/`, `admin/`.

- [ ] **Step 11.4: Commit**

```bash
git add src/app/totem/ src/app/admin/
git commit -m "feat(ui): add /totem and /admin stub pages (auth-guarded)"
```

---

## Task 12 — README + CI workflow + tag

**Files:**
- Modify: `README.md`
- Create: `.github/workflows/ci-ui.yml`

- [ ] **Step 12.1: Atualizar tabela de planos + comandos no README**

```markdown
| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia Next.js em http://localhost:3000 |
| `npm run build` | Build estático em `out/` |
| `npm run test:ui` | Testes Vitest de componentes React |
...

| Plano | Status | Conteúdo |
|---|---|---|
| 1 — Foundation DB | ✅ completo | Schema + RLS + sortear + pg_cron + Storage + seed |
| 2 — Edge Functions | ✅ completo | 7 Edge Functions Deno + shared utils + 29 Vitest tests |
| 3 — CLI | ✅ completo | 6 comandos + 17 tests |
| 4 — UI Foundation | ✅ completo | Next.js + Tailwind + shadcn/ui + Auth + Login + Welcome + Modal Admin |
| 5 — UI Totem | 🔜 próximo | Roleta 3D R3F + state machine + QR Code |
```

- [ ] **Step 12.2: Criar `.github/workflows/ci-ui.yml`**

```yaml
name: CI — UI

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'tests/components/**'
      - 'public/**'
      - 'tailwind.config.ts'
      - 'next.config.mjs'
      - 'package.json'
      - '.github/workflows/ci-ui.yml'
  pull_request:
    paths:
      - 'src/**'
      - 'tests/components/**'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - name: Build estático
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test
        run: npm run build
      - run: npm run test:ui
```

- [ ] **Step 12.3: Commit + tag**

```bash
git add README.md .github/workflows/ci-ui.yml
git commit -m "docs+ci: document UI plan and add ci-ui workflow"
git tag -a "plano-4-completo" -m "Plano 4: UI Foundation — Login + Welcome + Modal Admin + Auth/Admin contexts"
git log --oneline | head -20
```

---

## Resumo pós-Plano 4

✅ Next.js 15 App Router + `output: 'export'` (deploy GitHub Pages-ready)
✅ Tailwind CSS com paleta Altis (`#4afad4` / `#009993`) e variáveis HSL shadcn
✅ Componentes shadcn/ui base (button, input, label, dialog) + utils (`cn`)
✅ Theme provider (next-themes) + ThemeToggle (sol/lua)
✅ Supabase browser client com persistência de sessão
✅ AuthContext (signIn email/senha + onAuthStateChange)
✅ AdminContext (JWT-Admin em memória + countdown + auto-expiração)
✅ Páginas: `/login`, `/` (welcome com 2 game cards + admin), `/totem` (stub), `/admin` (gate)
✅ AuthGuard que redireciona para /login
✅ AdminModal consome Edge Function `validar-senha-admin` (Bearer auth + 401/429 handling)
✅ AdminBadge com countdown "Admin 29:42" + botão sair
✅ ~14 testes Vitest (LoginForm 4 + AuthGuard 3 + AdminModal 5 + GameCard 2)
✅ GHA workflow `ci-ui.yml` (typecheck + build + test)

**Validação final:** ao rodar `npm run dev`:
- `/login` aparece se não logado
- Login com `dev@altis.local`/`senha123` (seed do Plano 1) leva pra `/`
- `/` mostra welcome + 2 cards + botão Admin
- Modal Admin com `admin123` (seed do Plano 2) ativa badge "🛡 Admin 29:59"
- Tema sol/lua alterna entre paleta clara/escura

---

## Self-Review

**1. Spec coverage (§7 UI shell, §5.2 JWT-Admin, §8 welcome):**
- Login email/senha → Tasks 6, 7, 8 ✅
- Tela boas-vindas "Roleta + Dados + ícone admin" (§8.1) → Task 9 ✅
- Modal de senha admin (§8.2) consumindo `validar-senha-admin` → Task 10 ✅
- AdminBadge "Modo Admin 29:42 + Sair" → Task 10.7 ✅
- Theme dark/light com paleta `#4afad4`/`#009993` → Task 2 + 4 ✅
- AuthGuard client-side (spec §9 #25) → Task 8 ✅
- Static export `output: 'export'` → Task 1 ✅
- WCAG AA — texto sobre primary claro usa `#0d5d56` (contraste 4.5:1) → Task 2.2 ✅

**2. Placeholder scan:** zero TBD/TODO. Cada step tem código completo. ✅

**3. Type consistency:**
- `useAuth()` retorna `{ user, session, loading, signIn, signOut }` — consistente em Tasks 6, 7, 8, 9, 10.
- `useAdmin()` retorna `{ adminJwt, expiraEm, modoAdmin, ativar, desativar, segundosRestantes }` — Tasks 10, 11.
- `signIn(email, senha)` em Task 6 e Task 7 com mesma assinatura. ✅
- `AdminModal { open, onOpenChange, accessToken }` em Task 10.5 e usado em Task 10.6. ✅
- `Header { rightSlot? }` em Task 9.4 e usado em Tasks 9.5, 11.1, 11.2. ✅
- `GameCard { href, icone, titulo, subtitulo, disabled?, badge? }` em Task 9.1 e usado em Task 9.5. ✅

Plano completo, autocontido, executável task-por-task.
