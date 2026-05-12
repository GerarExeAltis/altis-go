import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

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
