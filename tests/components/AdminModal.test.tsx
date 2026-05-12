import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ativarMock = vi.fn();
vi.mock('@/contexts/AdminContext', () => ({
  useAdmin: () => ({
    adminJwt: null, expiraEm: null, modoAdmin: false,
    ativar: ativarMock, desativar: vi.fn(), segundosRestantes: 0,
  }),
}));

// env precisa de stub para o módulo @/lib/env não bombar com zod
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  },
}));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  ativarMock.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.fetch = fetchMock as any;
});

import { AdminModal } from '@/components/admin/AdminModal';

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
