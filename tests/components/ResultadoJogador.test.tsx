import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResultadoJogador } from '@/components/jogar/ResultadoJogador';

describe('ResultadoJogador', () => {
  it('premio real mostra Parabens + nome + WhatsApp', () => {
    render(<ResultadoJogador premioNome="Vale R$10" ePremioReal nome="Maria" />);
    expect(screen.getByText(/Parab.ns, Maria/)).toBeInTheDocument();
    expect(screen.getByText('Vale R$10')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me')
    );
  });

  it('nao foi dessa vez nao mostra link', () => {
    render(<ResultadoJogador premioNome="Nao foi" ePremioReal={false} nome="Joao" />);
    expect(screen.getByText(/N.o foi dessa vez, Jo.o/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omite o nome quando nao passado', () => {
    render(<ResultadoJogador premioNome="x" ePremioReal />);
    expect(screen.getByText(/Parab.ns!/)).toBeInTheDocument();
  });
});
