'use client';
import * as React from 'react';
import Image from 'next/image';
import { LogoAltis } from '@/components/LogoAltis';

interface Props {
  onTocar: () => void;
  disabled?: boolean;
}

export function AttractMode({ onTocar, disabled }: Props) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
        e.preventDefault();
        onTocar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTocar, disabled]);

  return (
    <button
      type="button"
      onClick={onTocar}
      disabled={disabled}
      className="relative flex min-h-screen w-full flex-col items-center justify-center gap-8 overflow-hidden bg-background text-center transition-opacity disabled:opacity-50"
      aria-label="Toque para participar da Roleta de Prêmios"
    >
      {/* Glow radial sutil ao fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-[ganhador-bg-pulse_4s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(var(--primary) / 0.18) 0%, transparent 60%)',
        }}
      />

      {/* GIF Altis (animacao da marca) em loop ao fundo, opacidade baixa */}
      <div className="pointer-events-none absolute right-12 top-12 h-40 w-40 opacity-30">
        <Image
          src="/altis-animacao.gif"
          alt=""
          width={160}
          height={160}
          unoptimized
          priority
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <LogoAltis size={128} />
        <h1 className="text-7xl font-extrabold tracking-tight">ROLETA DE PRÊMIOS</h1>
        <p className="text-3xl font-bold text-primary animate-[attract-glow_1.8s_ease-in-out_infinite]">
          TOQUE PARA PARTICIPAR
        </p>
        {disabled && <p className="text-sm text-muted-foreground">Gerando sessão...</p>}
      </div>
    </button>
  );
}
