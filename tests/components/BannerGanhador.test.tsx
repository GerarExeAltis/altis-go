import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BannerGanhador } from '@/components/totem/BannerGanhador';

describe('BannerGanhador', () => {
  it('mostra premio real e nome do jogador', () => {
    render(
      <BannerGanhador
        premioNome="Vale R$10"
        ePremioReal
        jogadorNome="Maria"
        onVoltar={vi.fn()}
      />
    );
    expect(screen.getByText(/Parab.ns, Maria/)).toBeInTheDocument();
    expect(screen.getByText('Vale R$10')).toBeInTheDocument();
    expect(screen.getByText(/retire/i)).toBeInTheDocument();
  });

  it('mostra "Nao foi dessa vez" quando ePremioReal=false', () => {
    render(
      <BannerGanhador
        premioNome="Nao foi"
        ePremioReal={false}
        jogadorNome="Joao"
        onVoltar={vi.fn()}
      />
    );
    expect(screen.getByText(/N.o foi dessa vez/)).toBeInTheDocument();
    expect(screen.queryByText('Nao foi')).not.toBeInTheDocument();
  });

  it('chama onVoltar apos segundosAteVoltar=0', async () => {
    const onVoltar = vi.fn();
    render(
      <BannerGanhador
        premioNome="x"
        ePremioReal
        jogadorNome="y"
        segundosAteVoltar={0}
        onVoltar={onVoltar}
      />
    );
    // segundosAteVoltar=0 -> useEffect dispara onVoltar imediatamente
    await new Promise((r) => setTimeout(r, 50));
    expect(onVoltar).toHaveBeenCalled();
  });
});
