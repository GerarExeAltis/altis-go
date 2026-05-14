'use client';
import * as React from 'react';

interface Props {
  inclinado: boolean;
  habilitado: boolean;
  onClick: () => void;
}

/**
 * Copo de dados desenhado em SVG. Ao clicar:
 *  - se habilitado, dispara onClick (operador do totem inicia o lance)
 *  - visualmente se inclina (rotacao + translateX) durante a animacao
 *
 * O copo fica posicionado em cima da area dos dados (top-center).
 * Pequena animacao de "shake" continua enquanto idle, dando dica
 * visual de que ele pode ser clicado.
 */
export function CopoDados({ inclinado, habilitado, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={habilitado ? onClick : undefined}
      disabled={!habilitado}
      aria-label="Clique no copo para lançar os dados"
      className={`relative inline-flex items-center justify-center transition-transform duration-300 ${
        habilitado ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-70'
      } ${inclinado ? 'animate-[copo-tomba_900ms_ease-in-out]' : habilitado ? 'animate-[copo-shake_1.6s_ease-in-out_infinite]' : ''}`}
      style={{
        transformOrigin: 'bottom center',
      }}
    >
      <svg
        width={120}
        height={150}
        viewBox="0 0 120 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sombra do copo */}
        <ellipse cx="60" cy="142" rx="40" ry="5" fill="#0a1d1c" opacity="0.3" />

        {/* Corpo do copo (trapezoide invertido) */}
        <path
          d="M 20 30 L 100 30 L 90 140 L 30 140 Z"
          fill="url(#gradCopo)"
          stroke="#5d6f80"
          strokeWidth="2.5"
        />

        {/* Borda superior (anel) */}
        <ellipse cx="60" cy="30" rx="40" ry="8" fill="#8fa1b3" stroke="#5d6f80" strokeWidth="2.5" />
        <ellipse cx="60" cy="30" rx="36" ry="5" fill="#1a2a30" />

        {/* Brilho lateral */}
        <path
          d="M 28 35 L 35 135"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.35"
          strokeLinecap="round"
        />

        {/* Detalhe decorativo no corpo */}
        <line x1="35" y1="60" x2="85" y2="60" stroke="#4afad4" strokeWidth="1.5" opacity="0.6" />
        <line x1="35" y1="100" x2="85" y2="100" stroke="#4afad4" strokeWidth="1.5" opacity="0.6" />

        <defs>
          <linearGradient id="gradCopo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fa1b3" />
            <stop offset="100%" stopColor="#5d6f80" />
          </linearGradient>
        </defs>
      </svg>

      {!inclinado && habilitado && (
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold text-primary animate-[attract-glow_1.8s_ease-in-out_infinite]">
          Clique para jogar
        </span>
      )}
    </button>
  );
}
