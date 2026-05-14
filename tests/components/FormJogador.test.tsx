import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormJogador } from '@/components/jogar/FormJogador';

function renderForm(props: Partial<React.ComponentProps<typeof FormJogador>> = {}) {
  return render(<FormJogador onSubmit={vi.fn()} enviando={false} {...props} />);
}

describe('FormJogador', () => {
  it('renderiza todos os campos obrigatórios + LGPD', () => {
    renderForm();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone|whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-?mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aceito/i)).toBeInTheDocument();
  });

  it('exige LGPD marcado antes de submeter', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '54988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'm@s.local');
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(await screen.findByText(/aceitar.*pol/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('valida telefone com DDD invalido', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '00988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'm@s.local');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(await screen.findByText(/DDD/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('chama onSubmit com payload limpo (empresa null quando vazia)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '54988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'maria@x.com');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      nome: 'Maria Silva',
      telefone: '54988887777',
      email: 'maria@x.com',
      empresa: null,
    });
  });

  it('envia empresa preenchida quando informada', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '54988887777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'maria@x.com');
    await user.type(screen.getByLabelText(/empresa/i), 'Altis Sistemas');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ empresa: 'Altis Sistemas' }));
  });

  it('aceita telefone com mascara (54) 98888-7777 e normaliza', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await user.type(screen.getByLabelText(/nome/i), 'Maria Silva');
    await user.type(screen.getByLabelText(/telefone|whatsapp/i), '(54) 98888-7777');
    await user.type(screen.getByLabelText(/e-?mail/i), 'maria@x.com');
    fireEvent.click(screen.getByLabelText(/aceito/i));
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ telefone: '54988887777' }));
  });
});
