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

import { AuthGuard } from '@/components/auth/AuthGuard';

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra loading enquanto carrega sessão', () => {
    useAuthMock.mockReturnValue({ loading: true, user: null, session: null });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
  });

  it('redireciona para /login quando sem sessão', async () => {
    vi.useRealTimers();
    replaceMock.mockClear();
    useAuthMock.mockReturnValue({ loading: false, user: null, session: null });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'));
  });

  it('renderiza children depois do piso minimo quando ha sessao', () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: '1', email: 'a@b' },
      session: { access_token: 't' },
    });
    render(<AuthGuard><div>protegido</div></AuthGuard>);
    // Antes do piso minimo, ainda mostra loading
    expect(screen.queryByText('protegido')).not.toBeInTheDocument();
    // Avanca alem do piso (LOADING_MIN_MS = 2000)
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.getByText('protegido')).toBeInTheDocument();
  });
});
