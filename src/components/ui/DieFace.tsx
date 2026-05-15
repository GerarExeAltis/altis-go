import * as React from 'react';

interface Props {
  /** Valor 1..6 a renderizar. */
  valor: number;
  /** Tamanho do lado do dado em pixels (default 48). */
  tamanho?: number;
  /** Cor de fundo da face (default marfim). */
  cor?: string;
  /** Cor dos pips (default quase preto). */
  corPip?: string;
  className?: string;
}

// Pip positions normalizadas em uma grade 3x3 (centro 0.5, 0.5).
// Cada entry mapeia valor -> lista de [x, y] dos pips.
const POSICOES_PIP: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
};

/**
 * Face de dado 2D em SVG — usada no carrossel para mostrar a
 * combinacao que ganha cada premio. Visual coerente com o dado 3D
 * (cor marfim, pips escuros) mas implementacao leve (1 SVG, sem
 * WebGL) — pode ser instanciada em qualquer lugar a custo baixo.
 */
export function DieFace({
  valor,
  tamanho = 48,
  cor = '#f8f5ef',
  corPip = '#0a1518',
  className,
}: Props) {
  const pips = POSICOES_PIP[valor] ?? [];
  const raioPip = 0.08; // 8% do lado — proporcional ao dado 3D
  const raioCanto = 0.16; // arredondamento da face

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 1 1"
      className={className}
      aria-label={`Dado mostrando ${valor}`}
      role="img"
    >
      <defs>
        <linearGradient id={`face-grad-${valor}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={cor} />
          <stop offset="100%" stopColor="#e4ddcc" />
        </linearGradient>
      </defs>

      <rect
        x={0.03}
        y={0.03}
        width={0.94}
        height={0.94}
        rx={raioCanto}
        ry={raioCanto}
        fill={`url(#face-grad-${valor})`}
        stroke="#cfc8b8"
        strokeWidth={0.015}
      />

      {pips.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={raioPip}
          fill={corPip}
        />
      ))}
    </svg>
  );
}

/**
 * Par de dados lado a lado — atalho usado no carrossel.
 */
export function ParDadosFace({
  par,
  tamanho = 48,
  gap = 6,
}: {
  par: [number, number];
  tamanho?: number;
  gap?: number;
}) {
  return (
    <div className="inline-flex items-center" style={{ gap }}>
      <DieFace valor={par[0]} tamanho={tamanho} />
      <DieFace valor={par[1]} tamanho={tamanho} />
    </div>
  );
}
