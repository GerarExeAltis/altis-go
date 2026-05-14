'use client';
import * as React from 'react';
import gsap from 'gsap';
import type { PremioDb } from '@/lib/totem/types';
import { ROTACOES_FACES } from './DadoCanvas';

interface Args {
  premios: PremioDb[];
  premioVencedorId: string | null;
  reduzir: boolean;
  onConcluir: () => void;
}

/**
 * Mapeia premio -> face do dado (1-6). Convencao: face = ordem_roleta + 1,
 * clampado em 1..6 caso o operador tenha cadastrado mais de 6 premios
 * (premios com ordem >= 6 reutilizam faces — visual nao bate perfeito,
 * mas o sorteio do backend permanece correto e o premio mostrado no
 * modal final e o que vale).
 */
function faceDoPremio(premio: PremioDb): number {
  return Math.min(6, Math.max(1, premio.ordem_roleta + 1));
}

/**
 * Animacao do dado em 2 fases (espelha usarAnimacaoRoleta):
 *
 * 1) SUSPENSE: tumblings continuos em loop assim que iniciar() e chamado,
 *    sem face alvo definida. Garante movimento imediato ao tocar GIRAR.
 *
 * 2) REVELACAO: quando premioVencedorId esta disponivel, interrompe o
 *    suspense e roda mais N voltas extras + ajuste fino na rotacao
 *    pre-calculada que coloca a face do premio voltada para cima (+Y).
 */
export function usarAnimacaoDado({
  premios, premioVencedorId, reduzir, onConcluir,
}: Args): {
  rotacao: [number, number, number];
  iniciar: () => void;
} {
  const [rotacao, setRotacao] = React.useState<[number, number, number]>([0, 0, 0]);
  const rotRef = React.useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const tweenSuspenseRef = React.useRef<gsap.core.Tween | null>(null);
  const animandoRef = React.useRef(false);
  const reveladoRef = React.useRef(false);

  const aplicarRot = React.useCallback(() => {
    setRotacao([rotRef.current.x, rotRef.current.y, rotRef.current.z]);
  }, []);

  const revelar = React.useCallback((vencedorId: string) => {
    if (reveladoRef.current) return;
    reveladoRef.current = true;

    const premio = premios.find((p) => p.id === vencedorId);
    if (!premio) {
      tweenSuspenseRef.current?.kill();
      onConcluir();
      return;
    }

    const face = faceDoPremio(premio);
    const [rx, ry, rz] = ROTACOES_FACES[face] ?? [0, 0, 0];

    // Acrescenta N voltas em cada eixo antes de assentar — efeito de
    // "tombo final" antes de assentar. Voltas tem que ser inteiras
    // pra terminar exatamente na rotacao pre-calculada.
    const voltas = 4;
    const finalX = rx + voltas * Math.PI * 2;
    const finalY = ry + (voltas + 1) * Math.PI * 2;
    const finalZ = rz + voltas * Math.PI * 2;

    tweenSuspenseRef.current?.kill();

    if (reduzir) {
      gsap.to(rotRef.current, {
        x: rx, y: ry, z: rz,
        duration: 0.4,
        ease: 'power1.inOut',
        onUpdate: aplicarRot,
        onComplete: onConcluir,
      });
      return;
    }

    gsap.to(rotRef.current, {
      x: finalX,
      y: finalY,
      z: finalZ,
      duration: 4.5,
      ease: 'expo.out',
      onUpdate: aplicarRot,
      onComplete: onConcluir,
    });
  }, [premios, onConcluir, reduzir, aplicarRot]);

  const iniciar = React.useCallback(() => {
    if (animandoRef.current) return;
    animandoRef.current = true;
    reveladoRef.current = false;

    // Fase suspense: tumble continuo
    tweenSuspenseRef.current?.kill();
    tweenSuspenseRef.current = gsap.to(rotRef.current, {
      x: '+=' + Math.PI * 2,
      y: '+=' + Math.PI * 2 * 1.3,
      z: '+=' + Math.PI * 2 * 0.7,
      duration: 1.0,
      ease: 'none',
      repeat: -1,
      onUpdate: aplicarRot,
    });

    if (premioVencedorId) {
      revelar(premioVencedorId);
    }
  }, [premioVencedorId, revelar, aplicarRot]);

  // Premio chega via Realtime durante o suspense -> dispara revelacao.
  React.useEffect(() => {
    if (animandoRef.current && premioVencedorId && !reveladoRef.current) {
      revelar(premioVencedorId);
    }
  }, [premioVencedorId, revelar]);

  // Reset quando o premio sai (volta para attract).
  React.useEffect(() => {
    if (!premioVencedorId) {
      animandoRef.current = false;
      reveladoRef.current = false;
      tweenSuspenseRef.current?.kill();
      tweenSuspenseRef.current = null;
    }
  }, [premioVencedorId]);

  return { rotacao, iniciar };
}
