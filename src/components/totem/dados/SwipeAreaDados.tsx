'use client';
import * as React from 'react';
import { DadoCanvas } from './DadoCanvas';

interface Props {
  aguardandoToque: boolean;
  iniciando: boolean;
  /** Disparado quando o usuario faz um swipe valido (ou toca simples). */
  onLancar: () => void;
  /** Rotacoes finais durante a fase de lance/revelacao. */
  rotations: Array<[number, number, number]>;
  /** Offsets de posicao durante o lance (sobe, voa, quica). */
  positions: Array<[number, number, number]>;
}

/**
 * Area de "lance dos dados" com detecao de gesture:
 *  - Durante "aguardandoToque" os dados flutuam em auto-rotate (hover).
 *  - O usuario pode TOCAR (tap) OU ARRASTAR para lancar — ambos
 *    chamam onLancar(). O swipe da mais "feel" pq o usuario sente
 *    que jogou de verdade; o tap e fallback para mouse-rapido.
 *  - Threshold: pointer-down + move >= 30px em <= 800ms = swipe.
 *  - Apos onLancar(), o estado externo muda (state.tipo='girando')
 *    e DadoCanvas usa rotations/positions controlados pelo hook
 *    usarAnimacaoDado (que simula o pulo+voo+bounce+assento).
 */
export function SwipeAreaDados({
  aguardandoToque, iniciando, onLancar, rotations, positions,
}: Props) {
  const inicioRef = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const [arrastando, setArrastando] = React.useState(false);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const ativo = aguardandoToque && !iniciando;

  const onDown = (e: React.PointerEvent) => {
    if (!ativo) return;
    inicioRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setArrastando(true);
    setOffset({ x: 0, y: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!ativo || !inicioRef.current) return;
    const dx = e.clientX - inicioRef.current.x;
    const dy = e.clientY - inicioRef.current.y;
    // Limita drag visual para nao "voar" demais antes de soltar
    setOffset({
      x: Math.max(-80, Math.min(80, dx)),
      y: Math.max(-80, Math.min(80, dy)),
    });
  };

  const onUp = (e: React.PointerEvent) => {
    if (!ativo || !inicioRef.current) return;
    const dx = e.clientX - inicioRef.current.x;
    const dy = e.clientY - inicioRef.current.y;
    const dt = Date.now() - inicioRef.current.t;
    const dist = Math.hypot(dx, dy);
    inicioRef.current = null;
    setArrastando(false);
    setOffset({ x: 0, y: 0 });

    // Tap simples (sem movimento) OU swipe valido => lancar
    const ehSwipe = dist >= 30 && dt <= 800;
    const ehTap = dist < 6 && dt <= 500;
    if (ehSwipe || ehTap) {
      onLancar();
    }
  };

  // Durante arrasto, aplicar offset visual a TODOS os dados (pegou na mao)
  const dragPositions = arrastando
    ? rotations.map(() => [offset.x / 80, -offset.y / 80, 0] as [number, number, number])
    : positions;

  return (
    <div
      className={`relative h-full w-full select-none touch-none ${
        ativo ? (arrastando ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
      role={ativo ? 'button' : undefined}
      tabIndex={ativo ? 0 : undefined}
      aria-label={ativo ? 'Arraste para lancar os dados' : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={(e) => {
        if (ativo && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onLancar();
        }
      }}
    >
      {aguardandoToque && !iniciando && !arrastando ? (
        // Dados "esperando ser pegos": flutuando + giro suave
        <DadoCanvas autoRotate count={2} zoom={120} autoRotateSpeed={0.5} hover />
      ) : (
        // Arrastando OU já lançou: dados controlados (rotations + positions)
        <DadoCanvas rotations={rotations} positions={dragPositions} count={2} zoom={120} />
      )}
    </div>
  );
}
