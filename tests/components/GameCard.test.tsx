import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameCard } from '@/components/home/GameCard';

describe('GameCard', () => {
  it('renderiza título e link quando habilitado', () => {
    render(<GameCard href="/totem" icone="🎰" titulo="Roleta" subtitulo="de prêmios" />);
    expect(screen.getByText('Roleta')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/totem');
  });

  it('renderiza badge "em breve" quando desabilitado', () => {
    render(
      <GameCard href="/x" icone="🎲" titulo="Dados" subtitulo="da sorte"
        disabled badge="em breve" />
    );
    expect(screen.getByText(/em breve/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
