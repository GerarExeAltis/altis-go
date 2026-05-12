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
      className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-background text-center transition-opacity disabled:opacity-50"
      aria-label="Toque para participar da Roleta de Prêmios"
    >
      <LogoAltis size={128} />
      <h1 className="text-6xl font-extrabold tracking-tight">ROLETA DE PRÊMIOS</h1>
      <p className="animate-pulse text-3xl font-bold text-primary">TOQUE PARA PARTICIPAR</p>
      <div className="mt-4">
        <Image
          src="/altis-animacao.gif"
          alt=""
          width={200}
          height={200}
          unoptimized
          aria-hidden="true"
        />
      </div>
      {disabled && <p className="text-sm text-muted-foreground">Gerando sessão...</p>}
    </button>
  );
}
