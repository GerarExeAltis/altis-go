import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';

describe('QrCodeScreen', () => {
  it('renderiza countdown em formato M:SS', () => {
    const exp = new Date(Date.now() + 125_000).toISOString();
    render(<QrCodeScreen url="https://x" expiraEm={exp} />);
    expect(screen.getByText(/Tempo restante:/)).toBeInTheDocument();
    expect(screen.getByText(/2:0\d/)).toBeInTheDocument();
  });

  it('mostra texto "Aponte a câmera" quando não está em aguardandoDados', () => {
    render(<QrCodeScreen url="https://x" expiraEm={new Date(Date.now() + 60_000).toISOString()} />);
    expect(screen.getByText(/Aponte a c.mera/)).toBeInTheDocument();
  });

  it('mostra "Aguardando dados" quando flag setada', () => {
    render(
      <QrCodeScreen
        url="https://x"
        expiraEm={new Date(Date.now() + 60_000).toISOString()}
        aguardandoDados
      />
    );
    expect(screen.getByText(/Aguardando dados/)).toBeInTheDocument();
  });
});
