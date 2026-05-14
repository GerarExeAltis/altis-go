'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

interface LoadingProps {
  /** Cobre a tela toda com overlay (default true). Quando false, ocupa o espaco do pai. */
  fullscreen?: boolean;
  /** Overlay opaco ou translucido (default opaco — esconde a tela). */
  translucido?: boolean;
  /** Texto somente para leitores de tela (a11y). Nao aparece visualmente. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Loading visual Altis: apenas o GIF /altis-animacao.gif centralizado.
 *
 * Uso:
 *   <Loading />                              -> fullscreen opaco, esconde tela
 *   <Loading translucido />                  -> fullscreen com blur
 *   <Loading fullscreen={false} />           -> inline em qualquer container
 */
export function Loading({
  fullscreen = true,
  translucido = false,
  ariaLabel = 'Carregando',
  className,
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
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
      {/* <img> nativo + basePath manual: Next/Image as vezes nao prefixa
          em static export com unoptimized=true, e GIF animado nao precisa
          da otimizacao. */}
      <img
        src={`${BASE_PATH}/altis-animacao.gif`}
        alt=""
        width={280}
        height={280}
        className="h-72 w-72 object-contain"
      />
    </div>
  );
}
