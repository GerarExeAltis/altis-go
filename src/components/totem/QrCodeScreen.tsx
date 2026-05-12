'use client';
import * as React from 'react';
import { QrCode } from '@/components/QrCode';
import { Smartphone } from 'lucide-react';

interface Props {
  url: string;
  expiraEm: string;
  aguardandoDados?: boolean;
}

function format(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function QrCodeScreen({ url, expiraEm, aguardandoDados }: Props) {
  const [agora, setAgora] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segundos = Math.max(0, Math.floor((new Date(expiraEm).getTime() - agora) / 1000));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <h1 className="text-4xl font-bold tracking-tight">
        {aguardandoDados ? 'Aguardando dados do jogador...' : 'Aponte a câmera do celular aqui'}
      </h1>
      <QrCode data={url} size={420} />
      <div
        className="flex items-center gap-2 text-2xl font-mono text-muted-foreground"
        aria-live="polite"
      >
        <Smartphone className="h-6 w-6" />
        <span>Tempo restante: {format(segundos)}</span>
      </div>
      {aguardandoDados && (
        <p className="text-lg text-muted-foreground animate-pulse">
          O jogador está preenchendo os dados...
        </p>
      )}
    </div>
  );
}
