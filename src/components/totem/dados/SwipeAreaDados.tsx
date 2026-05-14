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
  const SAIDA_MS = 550; // copo desce + encolhe + fade

  const lancar = () => {
    if (!habilitado || estadoCopo !== 'idle') return;
    setEstadoCopo('tremor');
    // No fim do tremor, copo comeca a sair E dados comecam a animar
    // SIMULTANEAMENTE — sem isso havia janela ~150ms onde o copo
    // ja estava fade-out parcial e os dados ainda em escala 0.05
    // (invisiveis), causando "tela vazia" momentanea.
    window.setTimeout(() => {
      setEstadoCopo('saindo');
      onLancar();
    }, TREMOR_MS);
    // Quando o copo termina sua saida (550ms apos virar 'saindo'),
    // oculta totalmente para os dados ficarem sem concorrer com a
    // animacao CSS persistente do "forwards".
    window.setTimeout(() => {
      setEstadoCopo('oculto');
    }, TREMOR_MS + SAIDA_MS);
  };

  // Reset do copo quando volta para idle externo
  React.useEffect(() => {
    if (habilitado && estadoCopo === 'oculto') {
      setEstadoCopo('idle');
    }
  }, [habilitado, estadoCopo]);

  const copoVisivel = habilitado && estadoCopo !== 'oculto';
  // Canvas dos dados monta JA NO TREMOR (em vez de esperar 'saindo')
  // para o Environment HDRI da drei ter tempo de baixar/inicializar
  // antes dos dados aparecerem. Em idle puro o Canvas nao monta
  // (economiza GPU enquanto o operador nao tocou).
  // Os dados ficam invisiveis (scale 0.05) ate iniciar() ser chamado.
  const dadosVisiveis =
    !habilitado || estadoCopo === 'tremor' ||
    estadoCopo === 'saindo' || estadoCopo === 'oculto';

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

      {/* Canvas 3D com os dados — o Trail luminoso so liga durante
          a animacao (iniciando), nao no estado final pos-resultado. */}
      {dadosVisiveis && (
        <DadoCanvas
          rotations={rotations}
          positions={positions}
          scales={scales}
          count={2}
          zoom={120}
          trail={iniciando}
        />
      )}
    </div>
  );
}
