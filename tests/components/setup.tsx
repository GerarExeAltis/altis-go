import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Env publicas exigidas por lib/env.ts (zod). Sao verificadas no
// import-time de getSupabaseBrowserClient, entao precisam estar setadas
// para o vitest carregar componentes que tocam o cliente.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-with-at-least-20-characters';

// Mock confetti — biblioteca acessa DOM e nao precisa rodar em testes.
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock next/image para evitar warning sobre next.config
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string } & Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', { src, alt, ...rest });
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => { cleanup(); });
