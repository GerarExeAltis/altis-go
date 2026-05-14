'use client';
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
      <Image
        src="/altis-animacao.gif"
        alt=""
        width={300}
        height={300}
        priority
        unoptimized
        className="h-70 w-70 object-contain"
      />
    </div>
  );
}
