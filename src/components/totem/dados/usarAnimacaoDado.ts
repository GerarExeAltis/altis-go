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

function faceDoPremio(premio: PremioDb): number {
  return Math.min(6, Math.max(1, premio.ordem_roleta + 1));
}

interface RotState { x: number; y: number; z: number; }
interface PosState { x: number; y: number; z: number; }

/**
 * Anima 2 dados num **arremesso fisico simulado**:
 *
 *   FASE 1 (PULO 350ms)  — dados sobem rapido (Y +1.6), giram meia volta.
 *   FASE 2 (VOO 1.2s)    — tumbleando no ar com ease.in pra cair de volta.
 *   FASE 3 (BOUNCE 350ms)- pequeno quique ao tocar o "chao" (Y volta a 0).
 *   FASE 4 (ASSENTA 1s)  — desacelera as rotacoes ate a face do premio.
 *
 * Cada dado tem deslocamento horizontal aleatorio durante o voo (vai e
 * volta para a base) para sensacao de movimento livre.
 */
export function usarAnimacaoDado({
  premios, premioVencedorId, reduzir, onConcluir,
}: Args): {
  rotations: Array<[number, number, number]>;
  positions: Array<[number, number, number]>;
  iniciar: () => void;
  reset: () => void;
} {
  const [rotations, setRotations] = React.useState<Array<[number, number, number]>>([
    [0, 0, 0],
    [0, 0, 0],
  ]);
  const [positions, setPositions] = React.useState<Array<[number, number, number]>>([
    [0, 0, 0],
    [0, 0, 0],
  ]);

  const rotRefs = React.useRef<[RotState, RotState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0.3, y: 0.2, z: 0.1 },
  ]);
  const posRefs = React.useRef<[PosState, PosState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ]);
  const tweensRef = React.useRef<Array<gsap.core.Tween | gsap.core.Timeline>>([]);
  const animandoRef = React.useRef(false);
  const reveladoRef = React.useRef(false);

  const aplicar = React.useCallback(() => {
    const [ra, rb] = rotRefs.current;
    const [pa, pb] = posRefs.current;
    setRotations([[ra.x, ra.y, ra.z], [rb.x, rb.y, rb.z]]);
    setPositions([[pa.x, pa.y, pa.z], [pb.x, pb.y, pb.z]]);
  }, []);

  const matar = React.useCallback(() => {
    tweensRef.current.forEach((t) => t.kill());
    tweensRef.current = [];
  }, []);

  const reset = React.useCallback(() => {
    matar();
    animandoRef.current = false;
    reveladoRef.current = false;
    rotRefs.current = [
      { x: 0, y: 0, z: 0 },
      { x: 0.3, y: 0.2, z: 0.1 },
    ];
    posRefs.current = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ];
    aplicar();
  }, [matar, aplicar]);

  const lancar = React.useCallback((vencedorId: string) => {
    if (reveladoRef.current) return;
    reveladoRef.current = true;
    animandoRef.current = true;

    const premio = premios.find((p) => p.id === vencedorId);
    if (!premio) {
      matar();
      onConcluir();
      return;
    }
    const face = faceDoPremio(premio);
    const [rxAlvo, ryAlvo, rzAlvo] = ROTACOES_FACES[face] ?? [0, 0, 0];

    matar();

    const tl = gsap.timeline({
      onUpdate: aplicar,
      onComplete: onConcluir,
    });

    if (reduzir) {
      // Modo prefere-motion-reduzido: animacao curta e direta
      rotRefs.current.forEach((ref, i) => {
        tl.to(ref, {
          x: rxAlvo, y: ryAlvo, z: rzAlvo,
          duration: 0.5, ease: 'power1.inOut',
        }, 0);
        tl.to(posRefs.current[i], { y: 0, duration: 0.3 }, 0);
      });
      tweensRef.current.push(tl);
      return;
    }

    // Voltas finais — cada dado gira N voltas extras pra parar na face alvo
    const voltas = 4;
    const lancamentoX = (Math.random() - 0.5) * 1.2; // deslocamento horizontal aleatorio
    const lancamentoZ = (Math.random() - 0.5) * 0.6;

    rotRefs.current.forEach((ref, i) => {
      const yMult = i === 0 ? 1 : 1.15;
      const xMult = i === 0 ? 1 : 0.9;
      const finalX = ref.x + voltas * Math.PI * 2 * xMult
                     + (((rxAlvo - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalY = ref.y + voltas * Math.PI * 2 * yMult
                     + (((ryAlvo - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalZ = ref.z + voltas * Math.PI * 2
                     + (((rzAlvo - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const pos = posRefs.current[i];
      const direcaoX = (i === 0 ? -1 : 1) * lancamentoX;

      // FASE 1: pulo (sobe + meia volta)
      tl.to(pos, {
        y: 1.8, x: direcaoX * 0.4, z: lancamentoZ * 0.3,
        duration: 0.32, ease: 'power2.out',
      }, 0);
      tl.to(ref, {
        x: ref.x + Math.PI * 0.7 * xMult,
        y: ref.y + Math.PI * 0.5 * yMult,
        z: ref.z + Math.PI * 0.3,
        duration: 0.32, ease: 'power1.out',
      }, 0);

      // FASE 2: voo (cai com gravidade simulada + tumble forte)
      tl.to(pos, {
        y: 0.3, x: direcaoX, z: lancamentoZ,
        duration: 0.6, ease: 'power2.in',
      }, 0.32);
      tl.to(ref, {
        x: ref.x + Math.PI * 0.7 * xMult + (finalX - ref.x) * 0.55,
        y: ref.y + Math.PI * 0.5 * yMult + (finalY - ref.y) * 0.55,
        z: ref.z + Math.PI * 0.3 + (finalZ - ref.z) * 0.55,
        duration: 0.6, ease: 'none',
      }, 0.32);

      // FASE 3: bounce (toca o chao e quica)
      tl.to(pos, {
        y: 0.5, duration: 0.18, ease: 'power2.out',
      }, 0.92);
      tl.to(pos, {
        y: 0.1, duration: 0.18, ease: 'power2.in',
      }, 1.10);
      tl.to(pos, {
        y: 0.25, duration: 0.12, ease: 'power2.out',
      }, 1.28);
      tl.to(pos, {
        y: 0, duration: 0.12, ease: 'power2.in',
      }, 1.40);

      // FASE 4: assenta — gira o restante das rotacoes ate a face alvo
      tl.to(pos, {
        x: 0, z: 0, duration: 1.2, ease: 'power2.out',
      }, 1.0);
      tl.to(ref, {
        x: finalX, y: finalY, z: finalZ,
        duration: 1.5, ease: 'power3.out',
      }, 1.0);
    });

    tweensRef.current.push(tl);
  }, [premios, onConcluir, reduzir, aplicar, matar]);

  const iniciar = React.useCallback(() => {
    if (animandoRef.current) return;
    if (!premioVencedorId) {
      // Sem vencedor ainda — entra em "suspense" leve (auto-rotate visivel
      // fica a cargo do componente em modo autoRotate; aqui so marcamos)
      animandoRef.current = true;
      return;
    }
    // Tem vencedor — lanca direto
    lancar(premioVencedorId);
  }, [premioVencedorId, lancar]);

  // Vencedor chegou via Realtime depois do iniciar — dispara lance
  React.useEffect(() => {
    if (animandoRef.current && premioVencedorId && !reveladoRef.current) {
      lancar(premioVencedorId);
    }
  }, [premioVencedorId, lancar]);

  React.useEffect(() => {
    if (!premioVencedorId) reset();
  }, [premioVencedorId, reset]);

  return { rotations, positions, iniciar, reset };
}
