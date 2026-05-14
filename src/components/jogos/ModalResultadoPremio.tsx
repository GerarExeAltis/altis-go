'use client';
import * as React from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { Trophy, Heart, X } from 'lucide-react';
import { urlFotoPremio } from '@/lib/storage/fotoPremio';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  jogadorNome?: string | null;
  premioFotoPath?: string | null;
  segundosAteVoltar?: number;
  onFinalizar: () => void;
}

/**
 * Modal de resultado de jogo — reutilizavel entre Roleta, Dados e
 * proximos jogos. Aparece sobreposto a tela do jogo e mostra o mesmo
 * conteudo visual do BannerGanhador (gradiente radial, trofeu pulsante,
 * texto PARABENS com glow, foto do premio, caixa dourada com o nome),
 * com a unica diferenca de que o trofeu fica no TOPO do card, metade
 * para fora dentro de um circulo — assinatura visual do modal.
 */
export function ModalResultadoPremio({
  premioNome,
  ePremioReal,
  jogadorNome,
  premioFotoPath,
  segundosAteVoltar = 25,
  onFinalizar,
}: Props) {
  const { reduzir } = usePreferredMotion();
  const [segundos, setSegundos] = React.useState(segundosAteVoltar);

  React.useEffect(() => {
    if (segundos <= 0) {
      onFinalizar();
      return;
    }
    const id = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [segundos, onFinalizar]);

  React.useEffect(() => {
    if (!ePremioReal || reduzir) return;
    dispararConfettiAltis();
  }, [ePremioReal, reduzir]);

  const fotoUrl = ePremioReal ? urlFotoPremio(premioFotoPath) : null;

  if (ePremioReal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm animate-[modal-fade-in_220ms_ease-out]"
      >
        <div className="relative w-full max-w-lg animate-[modal-pop-in_420ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          {/* Trofeu flutuando metade fora do topo do card */}
          <div className="absolute left-1/2 top-0 z-20 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#f4c430] bg-background shadow-[0_0_36px_rgba(244,196,48,0.55)]">
            <Trophy
              className="h-14 w-14 text-[#f4c430] drop-shadow-[0_0_18px_rgba(244,196,48,0.7)] animate-[ganhador-trofeu_2.2s_ease-in-out_infinite]"
              strokeWidth={2}
            />
          </div>

          {/* Card principal — mesma identidade visual do BannerGanhador */}
          <div className="relative overflow-hidden rounded-3xl border border-[#f4c430]/40 bg-card px-8 pb-8 pt-20 text-center shadow-2xl">
            {/* Gradient radial dourado + primary atras do conteudo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 animate-[ganhador-bg-pulse_3s_ease-in-out_infinite]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(244,196,48,0.30) 0%, rgba(74,250,212,0.18) 35%, transparent 70%)',
              }}
            />

            <button
              type="button"
              onClick={onFinalizar}
              aria-label="Finalizar e voltar ao inicio"
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center gap-5">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground animate-[ganhador-glow_2.2s_ease-in-out_infinite]">
                PARABÉNS{jogadorNome ? `, ${jogadorNome}` : ''}!
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

              <p className="mt-2 text-base text-muted-foreground">
                Retire seu prêmio com a atendente.
              </p>

              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onFinalizar}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-100"
                >
                  Finalizar
                </button>
                <p className="text-xs text-muted-foreground">
                  Voltando ao inicio em {segundos}s
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // "Nao foi dessa vez" — tom calmo, sem confetti, mesma estrutura do banner
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm animate-[modal-fade-in_220ms_ease-out]"
    >
      <div className="relative w-full max-w-md animate-[modal-pop-in_420ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
        <div className="absolute left-1/2 top-0 z-20 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-muted bg-background shadow-xl">
          <Heart className="h-14 w-14 text-muted-foreground" strokeWidth={2} />
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 pb-8 pt-20 text-center shadow-2xl">
          <button
            type="button"
            onClick={onFinalizar}
            aria-label="Finalizar e voltar ao inicio"
            className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <h1 className="text-3xl font-bold tracking-tight">
            Não foi dessa vez{jogadorNome ? `, ${jogadorNome}` : ''}!
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">Obrigado por participar.</p>

          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onFinalizar}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-100"
            >
              Finalizar
            </button>
            <p className="text-xs text-muted-foreground">
              Voltando ao inicio em {segundos}s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function dispararConfettiAltis() {
  const cores = ['#f4c430', '#4afad4', '#c0392b', '#ffffff', '#ffb700'];
  const fim = Date.now() + 3500;

  confetti({
    particleCount: 140,
    spread: 95,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.55 },
    colors: cores,
    scalar: 1.1,
  });

  const intervalo = window.setInterval(() => {
    if (Date.now() >= fim) {
      window.clearInterval(intervalo);
      return;
    }
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: cores });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: cores });
  }, 220);
}
