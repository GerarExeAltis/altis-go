'use client';
import * as React from 'react';
import { DadoCanvas } from '@/components/totem/dados/DadoCanvas';
import type { PremioDb } from '@/lib/totem/types';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

interface Props {
  onTocar: () => void;
  disabled?: boolean;
  /** Premios do evento ativo. Usado apenas para gating no callsite — o
   *  dado giratorio nao precisa de premios para renderizar (cubo unico). */
  premios: PremioDb[];
}

export function AttractModeDados({ onTocar, disabled, premios }: Props) {
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
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-center transition-opacity disabled:opacity-50"
      aria-label="Toque para participar dos Dados da Sorte"
    >
      <div className="pointer-events-none absolute left-8 top-8 h-32 w-32 opacity-60">
        <img
          src={`${BASE_PATH}/altis-animacao.gif`}
          alt=""
          width={128}
          height={128}
          aria-hidden
          className="h-full w-full object-contain"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="pointer-events-none h-[42vh] w-[42vh] max-h-[440px] max-w-[440px]">
          {premios.length > 0 ? <DadoCanvas autoRotate zoom={110} /> : null}
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">DADOS DA SORTE</h1>
          <p className="text-base font-bold tracking-wide text-primary animate-[attract-glow_1.8s_ease-in-out_infinite]">
            TOQUE PARA INICIAR
          </p>
          {disabled && <p className="text-xs text-muted-foreground">Gerando sessão...</p>}
        </div>
      </div>
    </button>
  );
}
