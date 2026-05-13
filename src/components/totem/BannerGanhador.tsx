'use client';
import * as React from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { Trophy, Heart } from 'lucide-react';
import { urlFotoPremio } from '@/lib/storage/fotoPremio';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  jogadorNome?: string | null;
  premioFotoPath?: string | null;
  segundosAteVoltar?: number;
  onVoltar: () => void;
}

function dispararConfettiAltis() {
  const corPrimary = '#4afad4';
  const corOuro = '#f4c430';
  const corVermelho = '#c0392b';
  const cores = [corOuro, corPrimary, corVermelho, '#ffffff', '#ffb700'];

  const duration = 3500;
  const fim = Date.now() + duration;

  // Burst central inicial
  confetti({
    particleCount: 140,
    spread: 95,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.55 },
    colors: cores,
    scalar: 1.1,
  });

  // Burst contínuo dos cantos
  const intervalo = window.setInterval(() => {
    const restante = fim - Date.now();
    if (restante <= 0) {
      window.clearInterval(intervalo);
      return;
    }
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors: cores,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors: cores,
    });
  }, 220);
}

export function BannerGanhador({
  premioNome, ePremioReal, jogadorNome, premioFotoPath,
  segundosAteVoltar = 25, onVoltar,
}: Props) {
  const { reduzir } = usePreferredMotion();
  const [segundos, setSegundos] = React.useState(segundosAteVoltar);

  React.useEffect(() => {
    if (segundos <= 0) {
      onVoltar();
      return;
    }
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [segundos, onVoltar]);

  // Dispara confetti uma vez ao montar (so quando ganhou de verdade).
  React.useEffect(() => {
    if (!ePremioReal || reduzir) return;
    dispararConfettiAltis();
  }, [ePremioReal, reduzir]);

  const fotoUrl = ePremioReal ? urlFotoPremio(premioFotoPath) : null;

  if (ePremioReal) {
    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background p-8 text-center"
        aria-live="polite"
      >
        {/* Gradient radial dourado + primary atras do conteudo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[ganhador-bg-pulse_3s_ease-in-out_infinite]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(244,196,48,0.30) 0%, rgba(74,250,212,0.18) 35%, transparent 70%)',
          }}
        />

        {/* Spring entry no bloco principal */}
        <div className="relative z-10 flex flex-col items-center gap-6 animate-[ganhador-entrada_650ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <Trophy
            className="h-32 w-32 text-[#f4c430] drop-shadow-[0_0_24px_rgba(244,196,48,0.7)] animate-[ganhador-trofeu_2.2s_ease-in-out_infinite]"
            strokeWidth={2}
          />

          <h1 className="text-7xl font-extrabold tracking-tight text-foreground animate-[ganhador-glow_2.2s_ease-in-out_infinite]">
            PARABÉNS{jogadorNome ? `, ${jogadorNome}` : ''}!
          </h1>

          <p className="text-2xl font-semibold text-muted-foreground">Você ganhou:</p>

          {/* Foto do premio (se existir) acima do nome */}
          {fotoUrl && (
            <div className="relative h-44 w-44 overflow-hidden rounded-xl ring-2 ring-[#f4c430]/60 shadow-[0_0_36px_rgba(244,196,48,0.4)]">
              <Image
                src={fotoUrl}
                alt={premioNome}
                fill
                className="object-cover"
                sizes="176px"
                unoptimized
              />
            </div>
          )}

          <p className="rounded-2xl border-4 border-[#f4c430] bg-card px-12 py-6 text-6xl font-extrabold uppercase tracking-wide text-[#f4c430] shadow-[0_0_42px_rgba(244,196,48,0.55)]">
            {premioNome}
          </p>

          <p className="mt-6 text-xl text-muted-foreground">
            Retire seu prêmio com a atendente.
          </p>
          <p className="text-sm text-muted-foreground">
            Voltando ao início em {segundos}s
          </p>
        </div>
      </div>
    );
  }

  // "Nao foi dessa vez" — tom calmo, sem confetti
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
