'use client';
import * as React from 'react';
import { DadoCanvas } from './DadoCanvas';
import { CopoDados } from './CopoDados';

interface Props {
  aguardandoToque: boolean;
  iniciando: boolean;
  /** Disparado quando o usuario clica no copo (ou pressiona Enter/Espaco). */
  onLancar: () => void;
  /** Rotacoes durante a fase de lance/revelacao. */
  rotations: Array<[number, number, number]>;
  /** Posicoes durante o lance (saida do copo, voo, colisao, assentamento). */
  positions: Array<[number, number, number]>;
}

/**
 * Area do jogo de dados estilo Yahtzee/"Duelo de Dados":
 *  - Copo SVG no canto superior esquerdo, com pequena agitacao
 *    enquanto idle (dica visual que e clicavel).
 *  - Clicar no copo (ou Enter/Espaco) dispara onLancar e tomba o
 *    copo visualmente. Em seguida, o hook usarAnimacaoDado anima
 *    os dois dados saindo do copo, voando em arcos cruzados,
 *    colidindo no meio e assentando no centro com a face do premio.
 */
export function SwipeAreaDados({
  aguardandoToque, iniciando, onLancar, rotations, positions,
}: Props) {
  const [copoTombou, setCopoTombou] = React.useState(false);
  const habilitado = aguardandoToque && !iniciando;

  const lancar = () => {
    if (!habilitado) return;
    setCopoTombou(true);
    onLancar();
    // Reseta visual do copo apos animacao terminar
    window.setTimeout(() => setCopoTombou(false), 900);
  };

  return (
    <div
      className="relative h-full w-full select-none"
      onKeyDown={(e) => {
        if (habilitado && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          lancar();
        }
      }}
      tabIndex={habilitado ? 0 : undefined}
    >
      {/* Copo no canto superior esquerdo */}
      <div className="absolute left-8 top-4 z-10">
        <CopoDados inclinado={copoTombou} habilitado={habilitado} onClick={lancar} />
      </div>

      {/* Canvas 3D ocupando a area inteira */}
      {habilitado && !copoTombou ? (
        // Idle: dados nao aparecem na cena ainda — estao "dentro do copo"
        <DadoCanvas
          positions={[[-3.5, 3, 0], [-3.5, 3, 0]]}
          rotations={[[0, 0, 0], [0, 0, 0]]}
          count={2}
          zoom={120}
        />
      ) : (
        // Lancou ou já está em animacao final: usa posicoes/rotacoes controladas
        <DadoCanvas
          rotations={rotations}
          positions={positions}
          count={2}
          zoom={120}
        />
      )}
    </div>
  );
}
