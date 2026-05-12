import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const mockSignIn = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    loading: false,
    user: null,
    session: null,
    signOut: vi.fn(),
  }),
}));

import { LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('renderiza inputs de email e senha', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/e-?mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('valida email obrigatório antes de submeter', async () => {
    mockSignIn.mockReset();
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/e-?mail.*obrigat/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('chama signIn com credenciais válidas', async () => {
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/e-?mail/i), 'dev@altis.local');
    await user.type(screen.getByLabelText(/senha/i), 'senha123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(mockSignIn).toHaveBeenCalledWith('dev@altis.local', 'senha123');
  });

  it('exibe mensagem de erro quando signIn rejeita', async () => {
    mockSignIn.mockReset();
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/e-?mail/i), 'dev@altis.local');
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/credenciais/i)).toBeInTheDocument();
  });
});
