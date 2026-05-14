'use client';
import * as React from 'react';

interface Props {
  /** Estado da animacao do copo. */
  estado: 'idle' | 'tremor' | 'saindo' | 'oculto';
  habilitado: boolean;
  onClick: () => void;
}

/**
 * Copo de dados vermelho posicionado no centro inferior da tela.
 *
 * Estados:
 *  - idle:     copo parado, esperando clique. Habilitado mostra tooltip.
 *  - tremor:   copo executa rotacao oscilante na parte superior (~600ms).
 *  - saindo:   copo desce + encolhe + desaparece (~400ms).
 *  - oculto:   copo nao e renderizado (display:none via opacity 0 pointer-events:none).
 *
 * As animacoes sao CSS keyframes em globals.css.
 */
export function CopoDados({ estado, habilitado, onClick }: Props) {
  const animacaoClass =
    estado === 'tremor'  ? 'animate-[copo-tremor_600ms_ease-in-out]' :
    estado === 'saindo'  ? 'animate-[copo-saindo_550ms_cubic-bezier(0.4,0,0.2,1)_forwards]' :
    estado === 'oculto'  ? 'opacity-0 pointer-events-none' :
    habilitado           ? 'animate-[copo-bobbing_2.4s_ease-in-out_infinite]' :
    '';

  return (
    <button
      type="button"
      onClick={habilitado && estado === 'idle' ? onClick : undefined}
      disabled={!habilitado || estado !== 'idle'}
      aria-label="Clique no copo para lançar os dados"
      className={`relative inline-flex items-center justify-center transition-transform ${
        habilitado && estado === 'idle' ? 'cursor-pointer hover:scale-105' : 'cursor-default'
      } ${animacaoClass}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      <svg
        width={150}
        height={180}
        viewBox="0 0 150 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sombra abaixo */}
        <ellipse cx="75" cy="172" rx="55" ry="6" fill="#5c0e0e" opacity="0.35" />

        {/* Corpo do copo (trapezio invertido) */}
        <path
          d="M 22 35 L 128 35 L 116 168 L 34 168 Z"
          fill="url(#gradCopoVermelho)"
          stroke="#7a0000"
          strokeWidth="3"
        />

        {/* Borda superior */}
        <ellipse cx="75" cy="35" rx="53" ry="10" fill="#a30000" stroke="#7a0000" strokeWidth="3" />
        <ellipse cx="75" cy="35" rx="48" ry="6" fill="#2a0606" />

        {/* Brilhos laterais */}
        <path
          d="M 32 42 L 40 162"
          stroke="#ffffff"
          strokeWidth="2.5"
          opacity="0.4"
          strokeLinecap="round"
        />
        <path
          d="M 116 50 L 110 155"
          stroke="#ff8a8a"
          strokeWidth="1.5"
          opacity="0.55"
          strokeLinecap="round"
        />

        {/* Listras decorativas */}
        <line x1="40" y1="75" x2="110" y2="75" stroke="#fbbcbc" strokeWidth="1.5" opacity="0.45" />
        <line x1="38" y1="118" x2="112" y2="118" stroke="#fbbcbc" strokeWidth="1.5" opacity="0.45" />

        <defs>
          <linearGradient id="gradCopoVermelho" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#d92929" />
            <stop offset="50%" stopColor="#b81818" />
            <stop offset="100%" stopColor="#7a0000" />
          </linearGradient>
        </defs>
      </svg>

      {habilitado && estado === 'idle' && (
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold text-primary animate-[attract-glow_1.8s_ease-in-out_infinite]">
          Clique para jogar
        </span>
      )}
    </button>
  );
}
