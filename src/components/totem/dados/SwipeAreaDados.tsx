'use client';
import * as React from 'react';
import { MotorFisicaDados } from './MotorFisicaDados';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  aguardandoToque: boolean;
  iniciando: boolean;
  /** Disparado quando o usuario toca para lancar (qualquer ponto da area). */
  onLancar: () => void;
  /** Quando true, dispara o lance dos dados (apos o servidor confirmar 'girando'). */
  iniciarLance: boolean;
  premios: PremioDb[];
  premioVencedorId: string | null;
  reduzirMovimento?: boolean;
  /** Disparado quando os dados terminam de assentar + snap. */
  onConcluir: () => void;
}

function faceDoPremio(premio: PremioDb): number {
  return Math.min(6, Math.max(1, premio.ordem_roleta + 1));
}

/**
 * Area do jogo de dados — toque em QUALQUER ponto da area dispara o
 * lance (estilo casino app moderno). O orquestrador interno e o
 * MotorFisicaDados, que cuida da fisica Rapier + snap para o premio
 * sorteado. Nao tem mais copo nem timeline GSAP — a coreografia
 * agora e emergente da fisica.
 */
export function SwipeAreaDados({
  aguardandoToque,
  iniciando,
  onLancar,
  iniciarLance,
  premios,
  premioVencedorId,
  reduzirMovimento = false,
  onConcluir,
}: Props) {
  const habilitado = aguardandoToque && !iniciando;

  // Trigger do lance: contador que so incrementa quando o servidor
  // confirma. Idle = 0; quando iniciarLance=true pela primeira vez,
  // vira 1. Se o componente nao for desmontado entre rounds (caso
  // raro), o efeito de reset volta para 0 quando iniciarLance=false.
  const [trigger, setTrigger] = React.useState(0);
  React.useEffect(() => {
    if (iniciarLance) setTrigger((t) => t + 1);
  }, [iniciarLance]);

  const faceAlvo = React.useMemo(() => {
    if (!premioVencedorId) return 1;
    const p = premios.find((x) => x.id === premioVencedorId);
    return p ? faceDoPremio(p) : 1;
  }, [premioVencedorId, premios]);

  const lancar = () => {
    if (!habilitado) return;
    onLancar();
  };

  return (
    <div
      className="relative h-full w-full select-none"
      onClick={lancar}
      onKeyDown={(e) => {
        if (habilitado && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          lancar();
        }
      }}
      tabIndex={habilitado ? 0 : undefined}
      role={habilitado ? 'button' : undefined}
      aria-label={habilitado ? 'Toque para lançar os dados' : undefined}
      style={{ cursor: habilitado ? 'pointer' : 'default' }}
    >
      <MotorFisicaDados
        faceAlvo={faceAlvo}
        lancarTrigger={trigger}
        reduzirMovimento={reduzirMovimento}
        onConcluir={onConcluir}
      />
    </div>
  );
}
