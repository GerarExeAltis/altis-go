import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AttractMode } from '@/components/totem/AttractMode';

describe('AttractMode', () => {
  it('clicar dispara onTocar', async () => {
    const onTocar = vi.fn();
    const user = userEvent.setup();
    render(<AttractMode onTocar={onTocar} />);
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onTocar).toHaveBeenCalledOnce();
  });

  it('disabled mostra texto e bloqueia onTocar', async () => {
    const onTocar = vi.fn();
    const user = userEvent.setup();
    render(<AttractMode onTocar={onTocar} disabled />);
    expect(screen.getByText(/gerando sess/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /participar/i }));
    expect(onTocar).not.toHaveBeenCalled();
  });
});
