'use client';
import * as React from 'react';
import { RoletaCanvas } from '@/components/totem/roleta/RoletaCanvas';
import type { PremioDb } from '@/lib/totem/types';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

interface Props {
  onTocar: () => void;
  disabled?: boolean;
  /** Premios do evento ativo para popular a roleta giratoria de fundo. */
  premios: PremioDb[];
}

export function AttractMode({ onTocar, disabled, premios }: Props) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      // Ignora se o foco esta num input/textarea/select OU se ha um
      // dialog aberto (Radix renderiza role=dialog so quando aberto).
      // Sem esta guarda, digitar a senha admin no ModalSaidaTotem e
      // apertar Enter para submeter ALSO disparava onTocar(), iniciando
      // o jogo por tras do modal.
      const ativo = document.activeElement as HTMLElement | null;
      if (ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      onTocar();
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

      {/* GIF Altis (animacao da marca) no topo esquerdo. Usamos <img>
          nativo + basePath manual para evitar problemas de prefix do
          Next/Image em static export. */}
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

      {/* Roleta 3D girando em loop, centralizada (mais compacta) */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="pointer-events-none h-[42vh] w-[42vh] max-h-[440px] max-w-[440px]">
          {premios.length > 0 ? (
            <RoletaCanvas premios={premios} autoRotate zoom={70} />
          ) : null}
        </div>

        {/* Letras embaixo da roleta, mais compactas */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">ROLETA DE PRÊMIOS</h1>
          <p className="text-base font-bold tracking-wide text-primary animate-[attract-glow_1.8s_ease-in-out_infinite]">
            TOQUE PARA INICIAR
          </p>
          {disabled && <p className="text-xs text-muted-foreground">Gerando sessão...</p>}
        </div>
      </div>
    </button>
  );
}
