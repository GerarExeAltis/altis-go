'use client';
import * as React from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { Trophy, Heart, Share2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { urlFotoPremio } from '@/lib/storage/fotoPremio';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { cn } from '@/lib/utils';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  nome?: string;
  premioFotoPath?: string | null;
}

function celebrarCelular() {
  const cores = ['#f4c430', '#4afad4', '#c0392b', '#ffffff', '#ffb700'];
  confetti({
    particleCount: 90,
    spread: 80,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.55 },
    colors: cores,
    scalar: 0.9,
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.2, y: 0.6 },
      colors: cores,
    });
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.8, y: 0.6 },
      colors: cores,
    });
  }, 400);
}

export function ResultadoJogador({ premioNome, ePremioReal, nome, premioFotoPath }: Props) {
  const { reduzir } = usePreferredMotion();
  const fotoUrl = ePremioReal ? urlFotoPremio(premioFotoPath) : null;

  React.useEffect(() => {
    if (!ePremioReal || reduzir) return;
    celebrarCelular();
  }, [ePremioReal, reduzir]);

  if (ePremioReal) {
    const linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(
      `Ganhei "${premioNome}" na Roleta Altis! 🎉`
    )}`;
    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-background p-6 text-center"
        role="status"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[ganhador-bg-pulse_3s_ease-in-out_infinite]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(244,196,48,0.28) 0%, rgba(74,250,212,0.15) 40%, transparent 75%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-5 animate-[ganhador-entrada_600ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <Trophy
            className="h-24 w-24 text-[#f4c430] drop-shadow-[0_0_18px_rgba(244,196,48,0.7)] animate-[ganhador-trofeu_2.2s_ease-in-out_infinite]"
          />

          <h1 className="text-4xl font-extrabold tracking-tight animate-[ganhador-glow_2.2s_ease-in-out_infinite]">
            PARABÉNS{nome ? `, ${nome}` : ''}!
          </h1>

          <p className="text-lg font-semibold text-muted-foreground">Você ganhou:</p>

          {fotoUrl && (
            <div className="relative h-36 w-36 overflow-hidden rounded-xl ring-2 ring-[#f4c430]/60 shadow-[0_0_24px_rgba(244,196,48,0.4)]">
              <Image
                src={fotoUrl}
                alt={premioNome}
                fill
                className="object-cover"
                sizes="144px"
                unoptimized
              />
            </div>
          )}

          <p className="rounded-2xl border-4 border-[#f4c430] bg-card px-8 py-4 text-3xl font-extrabold uppercase tracking-wide text-[#f4c430] shadow-[0_0_28px_rgba(244,196,48,0.55)]">
            {premioNome}
          </p>

          <p className="mt-2 max-w-xs text-base text-muted-foreground">
            Mostre esta tela ao operador da Altis para retirar o prêmio.
          </p>

          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
          >
            <Share2 className="h-4 w-4" />
            Compartilhar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      role="status"
    >
      <Heart className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold tracking-tight">
        Não foi dessa vez{nome ? `, ${nome}` : ''}!
      </h1>
      <p className="text-lg text-muted-foreground">
        Obrigado por participar. Volte para tentar a sorte em outro evento Altis!
      </p>
    </div>
  );
}
