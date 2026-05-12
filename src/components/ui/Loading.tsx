'use client';
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LoadingProps {
  /** Cobre a tela toda com overlay (default true). Quando false, ocupa o espaco do pai. */
  fullscreen?: boolean;
  /** Mensagem abaixo do spinner (default "Carregando..."). */
  mensagem?: string;
  /** Overlay opaco ou translucido (default opaco — esconde o estado da tela). */
  translucido?: boolean;
  className?: string;
}

/**
 * Loading visual com identidade Altis: logo pulsando no centro + anel rotacionando
 * em gradient #4afad4 -> #009993 + 3 pontos sequenciais abaixo.
 *
 * Uso:
 *   <Loading />                              -> fullscreen opaco com mensagem default
 *   <Loading mensagem="Carregando metricas..." />
 *   <Loading translucido />                  -> deixa entrever conteudo de fundo
 *   <Loading fullscreen={false} />           -> inline em qualquer container
 */
export function Loading({
  fullscreen = true,
  mensagem = 'Carregando...',
  translucido = false,
  className,
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={mensagem}
      className={cn(
        'flex items-center justify-center',
        fullscreen
          ? cn(
              'fixed inset-0 z-50',
              translucido ? 'bg-background/70 backdrop-blur-sm' : 'bg-background'
            )
          : 'min-h-[200px] w-full',
        className
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Anel + logo */}
        <div className="relative h-32 w-32">
          {/* Anel gradient rotacionando */}
          <svg
            className="absolute inset-0 h-full w-full animate-[loading-spin_1.2s_linear_infinite]"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="altisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4afad4" />
                <stop offset="100%" stopColor="#009993" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#altisGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="180 264"
            />
          </svg>

          {/* Logo pulsando no centro */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 animate-[loading-pulse_1.6s_ease-in-out_infinite]">
              <Image
                src="/altis-bet-logo.png"
                alt=""
                width={64}
                height={64}
                priority
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Mensagem + 3 dots */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">{mensagem}</p>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-[loading-dot_1.4s_ease-in-out_infinite] rounded-full bg-primary [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-[loading-dot_1.4s_ease-in-out_infinite] rounded-full bg-primary [animation-delay:200ms]" />
            <span className="h-1.5 w-1.5 animate-[loading-dot_1.4s_ease-in-out_infinite] rounded-full bg-primary [animation-delay:400ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
