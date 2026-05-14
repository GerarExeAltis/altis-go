import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Mock do supabase client usado pelo AuthGuard para checar perfis_operadores
const maybeSingleMock = vi.fn();
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingleMock(),
        }),
      }),
    }),
  }),
}));

import { AuthGuard } from '@/components/auth/AuthGuard';

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    maybeSingleMock.mockReset();
    // default: perfil ativo (cobre o caso feliz)
    maybeSingleMock.mockResolvedValue({ data: { ativo: true }, error: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra loading enquanto carrega sessão', () => {
    useAuthMock.mockReturnValue({ loading: true, user: null, session: null, signOut: vi.fn() });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
  });

  it('redireciona para /login quando sem sessão', async () => {
    vi.useRealTimers();
    replaceMock.mockClear();
    useAuthMock.mockReturnValue({ loading: false, user: null, session: null, signOut: vi.fn() });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'));
  });

  it('renderiza children quando sessao + perfil ativo', async () => {
    vi.useRealTimers();
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: '1', email: 'a@b' },
      session: { access_token: 't', user: { id: '1', email: 'a@b' } },
      signOut: vi.fn(),
    });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText('protegido')).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('mostra "Acesso negado" quando sem perfil', async () => {
    vi.useRealTimers();
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: '1', email: 'a@b' },
      session: { access_token: 't', user: { id: '1', email: 'a@b' } },
      signOut: vi.fn(),
    });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
  });

  it('mostra "Acesso negado" quando perfil inativo', async () => {
    vi.useRealTimers();
    maybeSingleMock.mockResolvedValueOnce({ data: { ativo: false }, error: null });
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: '1', email: 'a@b' },
      session: { access_token: 't', user: { id: '1', email: 'a@b' } },
      signOut: vi.fn(),
    });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    await waitFor(() => {
      expect(screen.getByText(/inativo/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('act block antes do piso (loading=true)', () => {
    useAuthMock.mockReturnValue({ loading: true, user: null, session: null, signOut: vi.fn() });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2100); });
    // ainda loading do AuthContext — não passa
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
  });
});
