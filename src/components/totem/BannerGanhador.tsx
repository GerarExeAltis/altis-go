'use client';
import * as React from 'react';
import { Trophy, Heart } from 'lucide-react';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  jogadorNome?: string | null;
  segundosAteVoltar?: number;
  onVoltar: () => void;
}

export function BannerGanhador({
  premioNome, ePremioReal, jogadorNome, segundosAteVoltar = 25, onVoltar,
}: Props) {
  const [segundos, setSegundos] = React.useState(segundosAteVoltar);

  React.useEffect(() => {
    if (segundos <= 0) {
      onVoltar();
      return;
    }
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [segundos, onVoltar]);

  if (ePremioReal) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/10 to-background p-8 text-center"
        aria-live="polite"
      >
        <Trophy className="h-32 w-32 text-primary" />
        <h1 className="text-6xl font-extrabold tracking-tight">
          Parabéns{jogadorNome ? `, ${jogadorNome}` : ''}!
        </h1>
        <p className="text-3xl font-bold">Você ganhou:</p>
        <p className="rounded-2xl border-4 border-primary bg-card px-12 py-6 text-5xl font-extrabold text-primary">
          {premioNome}
        </p>
        <p className="mt-8 text-lg text-muted-foreground">
          Retire seu prêmio com a atendente.
        </p>
        <p className="text-sm text-muted-foreground">
          Voltando ao início em {segundos}s
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center"
      aria-live="polite"
    >
      <Heart className="h-24 w-24 text-muted-foreground" />
      <h1 className="text-5xl font-bold tracking-tight">
        Não foi dessa vez{jogadorNome ? `, ${jogadorNome}` : ''}!
      </h1>
      <p className="text-2xl text-muted-foreground">Obrigado por participar.</p>
      <p className="text-sm text-muted-foreground">Voltando ao início em {segundos}s</p>
    </div>
  );
}
