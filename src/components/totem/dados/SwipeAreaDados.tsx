'use client';
import * as React from 'react';
import { DadoCanvas } from './DadoCanvas';
import { CopoDados } from './CopoDados';

interface Props {
  aguardandoToque: boolean;
  iniciando: boolean;
  /** Disparado quando o usuario clica no copo (apos sequencia de animacao). */
  onLancar: () => void;
  /** Rotacoes durante a fase de lance/revelacao. */
  rotations: Array<[number, number, number]>;
  /** Posicoes durante o lance. */
  positions: Array<[number, number, number]>;
  /** Escalas dos dados (efeito zoom-out enquanto giram). */
  scales: number[];
}

type EstadoCopo = 'idle' | 'tremor' | 'saindo' | 'oculto';

/**
 * Area do jogo de dados orquestrando 3 fases visuais:
 *
 *   1) Copo vermelho no centro inferior, parado/idle. Pequeno
 *      balanco "bobbing" enquanto idle convida o clique.
 *
 *   2) Click no copo => tremor de ~600ms (rotacao oscilante na parte
 *      superior). Apos o tremor, copo executa animacao de saida
 *      (~400ms): desce + encolhe + fade. Onde o copo estava, os
 *      dados surgem.
 *
 *   3) Dados executam 3s de rotacao+giro com escala diminuindo
 *      gradualmente (1.6 -> 1.0). Apos os 3s, fazem uma pequena
 *      inclinacao e giro leve (wobble) ate assentarem na face do
 *      premio.
 */
export function SwipeAreaDados({
  aguardandoToque, iniciando, onLancar, rotations, positions, scales,
}: Props) {
  const [estadoCopo, setEstadoCopo] = React.useState<EstadoCopo>('idle');
  const habilitado = aguardandoToque && !iniciando;

  const TREMOR_MS = 600;
  const SAIDA_MS = 400;

  const lancar = () => {
    if (!habilitado || estadoCopo !== 'idle') return;
    setEstadoCopo('tremor');
    // Apos o tremor, dispara saida do copo
    window.setTimeout(() => setEstadoCopo('saindo'), TREMOR_MS);
    // Apos saida, oculta copo e chama onLancar (que dispara backend
    // + animacao dos dados)
    window.setTimeout(() => {
      setEstadoCopo('oculto');
      onLancar();
    }, TREMOR_MS + SAIDA_MS);
  };

  // Reset do copo quando volta para idle externo
  React.useEffect(() => {
    if (habilitado && estadoCopo === 'oculto') {
      setEstadoCopo('idle');
    }
  }, [habilitado, estadoCopo]);

  const copoVisivel = habilitado && estadoCopo !== 'oculto';
  const dadosVisiveis = !habilitado || estadoCopo === 'oculto';

  return (
    <div
      className="relative h-full w-full select-none"
      onKeyDown={(e) => {
        if (habilitado && estadoCopo === 'idle' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          lancar();
        }
      }}
      tabIndex={habilitado ? 0 : undefined}
    >
      {/* Copo centralizado no rodape da area */}
      {copoVisivel && (
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <CopoDados estado={estadoCopo} habilitado={habilitado} onClick={lancar} />
        </div>
      )}

      {/* Canvas 3D com os dados — so monta quando o copo saiu */}
      {dadosVisiveis && (
        <DadoCanvas
          rotations={rotations}
          positions={positions}
          scales={scales}
          count={2}
          zoom={120}
        />
      )}
    </div>
  );
}
