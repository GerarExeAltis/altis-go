import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AttractMode } from '@/components/totem/AttractMode';

vi.mock('@/components/totem/roleta/RoletaCanvas', () => ({
  RoletaCanvas: () => null,
}));

describe('AttractMode', () => {
  it('clicar dispara onTocar', () => {
    const onTocar = vi.fn();
    render(<AttractMode onTocar={onTocar} premios={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /participar/i }));
    expect(onTocar).toHaveBeenCalledOnce();
  });

  it('disabled mostra texto e bloqueia onTocar', () => {
    const onTocar = vi.fn();
    render(<AttractMode onTocar={onTocar} disabled premios={[]} />);
    expect(screen.getByText(/gerando sess/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /participar/i }));
    expect(onTocar).not.toHaveBeenCalled();
  });
});
