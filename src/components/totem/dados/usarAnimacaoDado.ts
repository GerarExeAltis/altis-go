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
 * Coreografia em 3 segmentos com trajetoria PARABOLICA bem visivel
 * (lancamento + ponto alto + descida), total 3 segundos:
 *
 *  - LANÇAMENTO (0 -> 0.6s): dado parte do PONTO DO COPO (centro-baixo)
 *    para o PONTO ALTO LATERAL — sobe em arco, escala cresce 0.05 -> 1.6.
 *    Cada dado vai pra um lado (esquerda/direita). Sensacao de "saiu
 *    do copo voando".
 *
 *  - APICE (0.6 -> 1.0s): dado permanece no alto fazendo tumble forte
 *    (rotacao acelerada em todos os eixos), escala 1.6 (maxima).
 *
 *  - QUEDA (1.0 -> 2.6s): dado cai em arco do alto-lateral pra
 *    posicao final (lateral-baixo), escala 1.6 -> 1.0 gradualmente,
 *    rotacao desacelerando ate as ultimas voltas.
 *
 *  - ASSENTA (2.6 -> 3.0s): rotacao final converge na face do
 *    premio sorteado. Pequeno quique em Y.
 *
 *  - WOBBLE pos-3s (3.0 -> 4.4s): inclinacao leve + bobbing
 *    apresentando os dados na posicao final.
 *
 * Cada eixo de rotacao tem easing DIFERENTE (X power3.out, Y expo.out,
 * Z power2.out) — momentum nao uniforme, parece dado real.
 *
 * Drei <Trail> envolvendo cada dado mostra o caminho percorrido — fica
 * facil ver visualmente a trajetoria do copo ate o spot final.
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

    // Posicao inicial: dentro do copo (centro-baixo), escala minuscula
    rotRefs.current[0] = { x: 0, y: 0, z: 0 };
    rotRefs.current[1] = { x: 0.3, y: 0.2, z: 0.1 };
    posRefs.current[0] = { x: -0.1, y: 0.0, z: 0 };
    posRefs.current[1] = { x: 0.1, y: 0.0, z: 0 };
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

    // Pontos da trajetoria parabolica (em coordenadas do Canvas)
    //   START (copo): xStart=±0.1, y=0
    //   APEX  (alto): xApex=±2.2, y=2.6
    //   FINAL (baixo lateral): xFinal=±0.9, y=0
    const T_LANCAMENTO = 0.55;
    const T_APICE = 0.35;
    const T_QUEDA = 1.7;
    const T_ASSENTA = 0.4;
    // Total: 3.0s

    const voltasLancamento = 1.5;
    const voltasApice = 1.8;
    const voltasQueda = 3.0;

    rotRefs.current.forEach((ref, i) => {
      const lado = i === 0 ? -1 : 1;
      const yMult = i === 0 ? 1 : 1.15;
      const xMult = i === 0 ? 1 : 0.9;

      const apexX = lado * 2.2;
      const apexY = 2.6;
      const finalX = lado * 0.9;
      const finalY = 0;

      const finalRotX = ref.x + (voltasLancamento + voltasApice + voltasQueda) * Math.PI * 2 * xMult
                       + (((rxAlvo - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalRotY = ref.y + (voltasLancamento + voltasApice + voltasQueda) * Math.PI * 2 * yMult
                       + (((ryAlvo - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalRotZ = ref.z + (voltasLancamento + voltasApice + voltasQueda - 1) * Math.PI * 2
                       + (((rzAlvo - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const pos = posRefs.current[i];
      const scl = scaleRefs.current[i];

      // === FASE 1: LANCAMENTO (0 -> 0.55s) ===
      // Sai do copo subindo em arco ate o apice lateral
      tl.to(scl, { s: 1.6, duration: T_LANCAMENTO, ease: 'back.out(1.4)' }, 0);
      tl.to(pos, { x: apexX, duration: T_LANCAMENTO, ease: 'power2.out' }, 0);
      tl.to(pos, { y: apexY, duration: T_LANCAMENTO, ease: 'power2.out' }, 0);
      tl.to(ref, {
        x: '+=' + Math.PI * 2 * voltasLancamento * xMult,
        y: '+=' + Math.PI * 2 * voltasLancamento * yMult,
        z: '+=' + Math.PI * 2 * voltasLancamento,
        duration: T_LANCAMENTO,
        ease: 'power1.out',
      }, 0);

      // === FASE 2: APICE (0.55 -> 0.90s) ===
      // Dado fica no alto tumbleando rapido — visivel no pico
      const apexStart = T_LANCAMENTO;
      tl.to(pos, { y: apexY + 0.2, duration: T_APICE * 0.5, ease: 'sine.inOut' }, apexStart);
      tl.to(pos, { y: apexY - 0.1, duration: T_APICE * 0.5, ease: 'sine.in' }, apexStart + T_APICE * 0.5);
      tl.to(ref, {
        x: '+=' + Math.PI * 2 * voltasApice * xMult,
        y: '+=' + Math.PI * 2 * voltasApice * yMult,
        z: '+=' + Math.PI * 2 * voltasApice,
        duration: T_APICE,
        ease: 'none',
      }, apexStart);

      // === FASE 3: QUEDA (0.90 -> 2.60s) ===
      // Cai em arco ate o final lateral, escala diminui
      const quedaStart = apexStart + T_APICE;
      tl.to(pos, { x: finalX, duration: T_QUEDA, ease: 'power2.inOut' }, quedaStart);
      tl.to(pos, { y: finalY, duration: T_QUEDA, ease: 'power2.in' }, quedaStart);
      tl.to(scl, { s: 1.0, duration: T_QUEDA, ease: 'power1.inOut' }, quedaStart);
      // Rotacao com easings diferentes por eixo
      tl.to(ref, {
        x: finalRotX, duration: T_QUEDA, ease: 'power3.out',
      }, quedaStart);
      tl.to(ref, {
        y: finalRotY, duration: T_QUEDA, ease: 'expo.out',
      }, quedaStart);
      tl.to(ref, {
        z: finalRotZ, duration: T_QUEDA, ease: 'power2.out',
      }, quedaStart);

      // === FASE 4: ASSENTA (2.60 -> 3.00s) ===
      // Pequeno quique de chao + reafirma face final (ja esta proximo)
      const assentaStart = quedaStart + T_QUEDA;
      tl.to(pos, { y: 0.2, duration: T_ASSENTA * 0.4, ease: 'power2.out' }, assentaStart);
      tl.to(pos, { y: 0, duration: T_ASSENTA * 0.6, ease: 'power2.in' }, assentaStart + T_ASSENTA * 0.4);
    });

    // === WOBBLE pos-3s (3.0 -> 4.4s) ===
    const inicioWobble = 3.0;
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
        y: 0.06, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1,
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
