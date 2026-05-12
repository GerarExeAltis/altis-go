import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PremioForm } from '@/components/admin/PremioForm';

describe('PremioForm', () => {
  it('renderiza campos obrigatorios', () => {
    render(<PremioForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/nome do pr.mio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estoque inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cor da fatia/i)).toBeInTheDocument();
  });

  it('rejeita peso negativo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome do pr.mio/i), 'Vale');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '-5' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '10' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/peso.*0/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('e_premio_real false aceita estoque 0', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome do pr.mio/i), 'Nao foi');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '0' } });
    fireEvent.click(screen.getByLabelText(/slot.*n.o ganha/i));
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSubmit).toHaveBeenCalled();
    const call = onSubmit.mock.calls[0][0];
    expect(call.nome).toBe('Nao foi');
    expect(call.peso_base).toBe(30);
    expect(call.estoque_inicial).toBe(0);
    expect(call.e_premio_real).toBe(false);
  });

  it('e_premio_real true rejeita estoque 0', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome do pr.mio/i), 'Vale');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/estoque.*0/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submete payload completo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PremioForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome do pr.mio/i), 'Vale R$10');
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/estoque inicial/i), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSubmit).toHaveBeenCalled();
    const call = onSubmit.mock.calls[0][0];
    expect(call.nome).toBe('Vale R$10');
    expect(call.peso_base).toBe(1);
    expect(call.estoque_inicial).toBe(100);
    expect(call.e_premio_real).toBe(true);
  });
});
