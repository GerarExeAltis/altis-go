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

  it('mostra o usuario logado no rodape', () => {
    render(<AdminSidebar abaAtiva="dashboard" onChange={vi.fn()} />);
    expect(screen.getByText('dev@altis.local')).toBeInTheDocument();
  });
});
