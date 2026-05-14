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
 * Coreografia da fase pos-copo, 3 segundos exatos:
 *
 * SAIDA DO COPO (0-300ms):
 *   Dados partem do PONTO ONDE O COPO ESTAVA (centro-baixo da tela)
 *   com escala 0.05 e "florescem" para escala 1.6 com leve translacao
 *   pra fora (sensacao de "saindo de dentro do copo"). Cada dado tem
 *   ~80ms de delay entre si para nao parecerem espelhados.
 *
 * ROLAGEM DINAMICA (300-2700ms = 2.4s):
 *   Rotacao + giro com:
 *     - Velocidades diferentes em cada eixo (X faster, Z slower)
 *     - Easings diferentes por eixo (X power3.out, Y expo.out, Z power2.out)
 *       — simula momentum nao uniforme de um cubo real rolando.
 *     - Scale diminui de 1.6 -> 1.0 (zoom-out gradual).
 *     - Posicao migra do centro pras laterais (lateral spread).
 *
 * ASSENTAMENTO (2700-3000ms = 300ms):
 *   Rotacao final converge na face do premio + escala final 1.0.
 *
 * WOBBLE FINAL (3000-4400ms = 1.4s):
 *   Apos 3s exatos, dados ja estao na face certa. Aplica um pequeno
 *   wobble (yoyo) na rotacao X/Z e bobbing leve em Y — efeito de
 *   "se inclinando e girando levemente" como pedido.
 */
export function usarAnimacaoDado({
  premios, premioVencedorId, reduzir, onConcluir,
}: Args): {
  rotations: Array<[number, number, number]>;
  positions: Array<[number, number, number]>;
  scales: number[];
  iniciar: () => void;
  reset: () => void;
} {
  const [rotations, setRotations] = React.useState<Array<[number, number, number]>>([
    [0, 0, 0], [0, 0, 0],
  ]);
  const [positions, setPositions] = React.useState<Array<[number, number, number]>>([
    [0, 0, 0], [0, 0, 0],
  ]);
  const [scales, setScales] = React.useState<number[]>([0.05, 0.05]);

  const rotRefs = React.useRef<[RotState, RotState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0.3, y: 0.2, z: 0.1 },
  ]);
  const posRefs = React.useRef<[PosState, PosState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ]);
  const scaleRefs = React.useRef<[{ s: number }, { s: number }]>([
    { s: 0.05 }, { s: 0.05 },
  ]);
  const tweensRef = React.useRef<Array<gsap.core.Tween | gsap.core.Timeline>>([]);
  const animandoRef = React.useRef(false);
  const reveladoRef = React.useRef(false);

  const aplicar = React.useCallback(() => {
    const [ra, rb] = rotRefs.current;
    const [pa, pb] = posRefs.current;
    const [sa, sb] = scaleRefs.current;
    setRotations([[ra.x, ra.y, ra.z], [rb.x, rb.y, rb.z]]);
    setPositions([[pa.x, pa.y, pa.z], [pb.x, pb.y, pb.z]]);
    setScales([sa.s, sb.s]);
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
    scaleRefs.current = [{ s: 0.05 }, { s: 0.05 }];
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

    // Estado inicial: dados onde o copo estava, com escala minuscula
    // (vao "florescer" a partir dali).
    rotRefs.current[0] = { x: Math.random() * 0.8, y: Math.random() * 0.8, z: Math.random() * 0.5 };
    rotRefs.current[1] = { x: Math.random() * 0.8, y: Math.random() * 0.8, z: Math.random() * 0.5 };
    posRefs.current[0] = { x: -0.1, y: 0.2, z: 0 };
    posRefs.current[1] = { x: 0.1, y: 0.2, z: 0 };
    scaleRefs.current[0] = { s: 0.05 };
    scaleRefs.current[1] = { s: 0.05 };
    aplicar();

    const tl = gsap.timeline({
      onUpdate: aplicar,
      onComplete: onConcluir,
    });

    if (reduzir) {
      rotRefs.current.forEach((ref, i) => {
        tl.to(ref, { x: rxAlvo, y: ryAlvo, z: rzAlvo, duration: 0.5, ease: 'power1.inOut' }, 0);
        tl.to(posRefs.current[i], {
          x: i === 0 ? -0.9 : 0.9, y: 0, z: 0, duration: 0.5,
        }, 0);
        tl.to(scaleRefs.current[i], { s: 1, duration: 0.5 }, 0);
      });
      tweensRef.current.push(tl);
      return;
    }

    const DURACAO = 3.0;        // tempo total ate a face alvo
    const SAIDA_DUR = 0.32;     // florescimento inicial
    const SAIDA_STAGGER = 0.08; // delay entre os 2 dados
    const ROLAGEM_DUR = DURACAO - SAIDA_DUR; // 2.68s de rolagem ate parar
    const voltas = 5;

    rotRefs.current.forEach((ref, i) => {
      const yMult = i === 0 ? 1 : 1.15;
      const xMult = i === 0 ? 1 : 0.9;
      const baseX = i === 0 ? -0.9 : 0.9;
      const inicio = i * SAIDA_STAGGER; // stagger entre os 2 dados

      const finalX = ref.x + voltas * Math.PI * 2 * xMult
                     + (((rxAlvo - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalY = ref.y + voltas * Math.PI * 2 * yMult
                     + (((ryAlvo - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalZ = ref.z + (voltas - 1) * Math.PI * 2
                     + (((rzAlvo - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const pos = posRefs.current[i];
      const scl = scaleRefs.current[i];

      // SAIDA DO COPO (florescimento + leve subida)
      tl.to(scl, { s: 1.6, duration: SAIDA_DUR, ease: 'back.out(1.6)' }, inicio);
      tl.to(pos, {
        x: (i === 0 ? -0.6 : 0.6),
        y: 0.7,
        z: 0,
        duration: SAIDA_DUR,
        ease: 'power2.out',
      }, inicio);
      // Spin inicial energico (medio giro durante a saida)
      tl.to(ref, {
        x: '+=' + Math.PI * 1.0 * xMult,
        y: '+=' + Math.PI * 1.4 * yMult,
        z: '+=' + Math.PI * 0.6,
        duration: SAIDA_DUR,
        ease: 'power1.out',
      }, inicio);

      // ROLAGEM DINAMICA — easings diferentes por eixo dao
      // sensacao de momentum nao uniforme (cubo real nao gira
      // simetricamente em todos os eixos).
      const apos = inicio + SAIDA_DUR;
      tl.to(ref, { x: finalX, duration: ROLAGEM_DUR, ease: 'power3.out' }, apos);
      tl.to(ref, { y: finalY, duration: ROLAGEM_DUR, ease: 'expo.out'  }, apos);
      tl.to(ref, { z: finalZ, duration: ROLAGEM_DUR, ease: 'power2.out' }, apos);

      // Posicao migra pro spot final (lateral) com leve quica
      tl.to(pos, {
        x: baseX,
        y: 0,
        z: 0,
        duration: ROLAGEM_DUR,
        ease: 'power2.out',
      }, apos);

      // Escala diminui ate 1.0 (zoom-out)
      tl.to(scl, { s: 1.0, duration: ROLAGEM_DUR, ease: 'power1.inOut' }, apos);
    });

    // WOBBLE pos-3s (1.4s): pequena inclinacao + giro continuo leve
    const inicioWobble = DURACAO;
    rotRefs.current.forEach((ref, i) => {
      tl.to(ref, {
        x: '+=' + 0.18 * (i === 0 ? 1 : -1),
        z: '+=' + 0.14 * (i === 0 ? -1 : 1),
        duration: 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
      }, inicioWobble);
      tl.to(posRefs.current[i], {
        y: 0.05, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1,
      }, inicioWobble);
    });

    tweensRef.current.push(tl);
  }, [premios, onConcluir, reduzir, aplicar, matar]);

  const iniciar = React.useCallback(() => {
    if (animandoRef.current) return;
    if (!premioVencedorId) {
      animandoRef.current = true;
      return;
    }
    lancar(premioVencedorId);
  }, [premioVencedorId, lancar]);

  React.useEffect(() => {
    if (animandoRef.current && premioVencedorId && !reveladoRef.current) {
      lancar(premioVencedorId);
    }
  }, [premioVencedorId, lancar]);

  React.useEffect(() => {
    if (!premioVencedorId) reset();
  }, [premioVencedorId, reset]);

  return { rotations, positions, scales, iniciar, reset };
}
