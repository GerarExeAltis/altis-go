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

  it('submete payload valido', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EventoForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Feira Construsul');
    fireEvent.change(screen.getByLabelText(/data de in.cio/i), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText(/data de fim/i), { target: { value: '2026-06-05' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSubmit).toHaveBeenCalled();
    const call = onSubmit.mock.calls[0][0];
    expect(call.nome).toBe('Feira Construsul');
    expect(call.data_inicio).toBe('2026-06-01');
    expect(call.data_fim).toBe('2026-06-05');
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
