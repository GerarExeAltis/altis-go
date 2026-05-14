import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'dev@altis.local', id: '00000000-0000-0000-0000-000000000001' },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/contexts/AdminContext', () => ({
  useAdmin: () => ({
    adminJwt: 'jwt-fake',
    expiraEm: null,
    modoAdmin: true,
    segundosRestantes: 1740, // 29:00
    ativar: vi.fn(),
    desativar: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

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

  it('mostra o usuario logado e timer admin no rodape', () => {
    render(<AdminSidebar abaAtiva="dashboard" onChange={vi.fn()} />);
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByText(/Admin \d{2}:\d{2}/)).toBeInTheDocument();
  });
});
