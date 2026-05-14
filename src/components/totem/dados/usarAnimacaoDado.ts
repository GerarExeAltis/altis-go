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
interface Ponto3D { x: number; y: number; z: number; }

/**
 * Gera posicoes finais ESPALHADAS no plano XZ (chao da cena) — Y e
 * o eixo VERTICAL no Three.js, entao Y final precisa ser 0 (apoio
 * no chao). Antes o codigo usava plano XY o que fazia dados ficarem
 * suspensos no ar e empilhados na perspectiva da camera isometrica.
 *
 * Aplica repulsao: se distancia em XZ < MIN_DIST, empurra.
 *
 * Area util do canvas (camera ortografica isometrica zoom 120):
 *   x ∈ [-2.6, 2.6]    z ∈ [-1.6, 1.6] (limitado pra nao sair pra
 *   tras da camera). y final fixo em 0 (chao).
 */
function calcularDispersao(): {
  apice: [Ponto3D, Ponto3D];
  final: [Ponto3D, Ponto3D];
} {
  const RAIO_MIN = 1.5;
  const RAIO_MAX = 2.3;
  const RAIO_APICE = 2.4;
  const MIN_DIST_XZ = 1.7;
  const Y_APICE_MIN = 2.0;
  const Y_APICE_MAX = 2.8;
  const Z_FATOR = 0.55; // achata o eixo Z (profundidade) para nao
                       // sairem muito pra tras da camera isometrica

  // Angulo aleatorio inicial 0..2pi para o dado 1; segundo fica
  // oposto com jitter para os 2 irem em direcoes distintas.
  const a1 = Math.random() * Math.PI * 2;
  const a2 = a1 + Math.PI + (Math.random() - 0.5) * 0.8;

  const d1 = RAIO_MIN + Math.random() * (RAIO_MAX - RAIO_MIN);
  const d2 = RAIO_MIN + Math.random() * (RAIO_MAX - RAIO_MIN);

  // y=-0.02: dado fica ligeiramente abaixo do "centro" do canvas,
  // alinhado com a ContactShadows em y=-0.52 (base do dado encostada
  // no chao da cena). Sem isso parecia levitando.
  const final: [Ponto3D, Ponto3D] = [
    { x: Math.cos(a1) * d1, y: -0.02, z: Math.sin(a1) * d1 * Z_FATOR },
    { x: Math.cos(a2) * d2, y: -0.02, z: Math.sin(a2) * d2 * Z_FATOR },
  ];

  // Repulsao no plano XZ
  const dx = final[0].x - final[1].x;
  const dz = final[0].z - final[1].z;
  const d = Math.hypot(dx, dz);
  if (d < MIN_DIST_XZ) {
    const ux = d > 0.001 ? dx / d : 1;
    const uz = d > 0.001 ? dz / d : 0;
    const push = (MIN_DIST_XZ - d) / 2 + 0.15;
    final[0].x += ux * push;
    final[0].z += uz * push;
    final[1].x -= ux * push;
    final[1].z -= uz * push;
  }

  // Apice da trajetoria — mesmo angulo no plano XZ, Y elevado
  const apice: [Ponto3D, Ponto3D] = [
    {
      x: Math.cos(a1) * RAIO_APICE,
      y: Y_APICE_MIN + Math.random() * (Y_APICE_MAX - Y_APICE_MIN),
      z: Math.sin(a1) * RAIO_APICE * Z_FATOR,
    },
    {
      x: Math.cos(a2) * RAIO_APICE,
      y: Y_APICE_MIN + Math.random() * (Y_APICE_MAX - Y_APICE_MIN),
      z: Math.sin(a2) * RAIO_APICE * Z_FATOR,
    },
  ];

  return { apice, final };
}

/**
 * Coreografia de DISPERSAO PELA TELA, 3 segundos exatos:
 *
 *  - LANCAMENTO (0 -> 0.55s): dado parte da posicao do copo
 *    (centro-baixo) para o APICE com angulo aleatorio. Escala
 *    0.05 -> 1.6 (back.out).
 *  - APICE (0.55 -> 0.90s): tumbleia no alto.
 *  - QUEDA (0.90 -> 2.60s): cai em arco ate a posicao FINAL
 *    aleatoria (com relaxamento contra aglomeracao). Escala
 *    1.6 -> 1.0 (zoom-out).
 *  - ASSENTA (2.60 -> 3.00s): pequeno quique de chao + face do
 *    premio voltada pra cima.
 *  - WOBBLE pos-3s (3.0 -> 4.4s): inclinacao + bobbing leve.
 *
 * Repulsao garante que mesmo com angulos proximos, os dois dados
 * acabam separados na tela.
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

    // Posicoes alvo aleatorias com repulsao
    const dispersao = calcularDispersao();

    // Estado inicial: dentro do copo (centro-baixo)
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
          x: dispersao.final[i].x, y: dispersao.final[i].y, z: dispersao.final[i].z, duration: 0.5,
        }, 0);
        tl.to(scaleRefs.current[i], { s: 1, duration: 0.5 }, 0);
      });
      tweensRef.current.push(tl);
      return;
    }

    const T_LANCAMENTO = 0.55;
    const T_APICE = 0.35;
    const T_QUEDA = 1.70;
    const T_ASSENTA = 0.40;
    // Total: 3.0s

    const voltasTotais = 6;

    rotRefs.current.forEach((ref, i) => {
      const yMult = i === 0 ? 1 : 1.15;
      const xMult = i === 0 ? 1 : 0.9;
      const apice = dispersao.apice[i];
      const final = dispersao.final[i];

      const finalRotX = ref.x + voltasTotais * Math.PI * 2 * xMult
                       + (((rxAlvo - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalRotY = ref.y + voltasTotais * Math.PI * 2 * yMult
                       + (((ryAlvo - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalRotZ = ref.z + (voltasTotais - 1) * Math.PI * 2
                       + (((rzAlvo - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const pos = posRefs.current[i];
      const scl = scaleRefs.current[i];

      // LANCAMENTO — sai do copo subindo em arco ate o apice
      tl.to(scl, { s: 1.6, duration: T_LANCAMENTO, ease: 'back.out(1.4)' }, 0);
      tl.to(pos, { x: apice.x, duration: T_LANCAMENTO, ease: 'power2.out' }, 0);
      tl.to(pos, { y: apice.y, duration: T_LANCAMENTO, ease: 'power2.out' }, 0);
      tl.to(pos, { z: apice.z, duration: T_LANCAMENTO, ease: 'power2.out' }, 0);
      tl.to(ref, {
        x: '+=' + Math.PI * 3 * xMult,
        y: '+=' + Math.PI * 3 * yMult,
        z: '+=' + Math.PI * 2,
        duration: T_LANCAMENTO,
        ease: 'power1.out',
      }, 0);

      // APICE — tumble no alto
      const apiceStart = T_LANCAMENTO;
      tl.to(pos, { y: apice.y + 0.2, duration: T_APICE * 0.4, ease: 'sine.inOut' }, apiceStart);
      tl.to(pos, { y: apice.y - 0.1, duration: T_APICE * 0.6, ease: 'sine.in' }, apiceStart + T_APICE * 0.4);
      tl.to(ref, {
        x: '+=' + Math.PI * 2 * xMult,
        y: '+=' + Math.PI * 2 * yMult,
        z: '+=' + Math.PI * 1.5,
        duration: T_APICE,
        ease: 'none',
      }, apiceStart);

      // QUEDA — cai em arco ate o final disperso (no plano XZ)
      const quedaStart = apiceStart + T_APICE;
      tl.to(pos, { x: final.x, duration: T_QUEDA, ease: 'power2.inOut' }, quedaStart);
      tl.to(pos, { y: final.y, duration: T_QUEDA, ease: 'power2.in' }, quedaStart);
      tl.to(pos, { z: final.z, duration: T_QUEDA, ease: 'power2.inOut' }, quedaStart);
      tl.to(scl, { s: 1.0, duration: T_QUEDA, ease: 'power1.inOut' }, quedaStart);
      tl.to(ref, { x: finalRotX, duration: T_QUEDA, ease: 'power3.out' }, quedaStart);
      tl.to(ref, { y: finalRotY, duration: T_QUEDA, ease: 'expo.out' }, quedaStart);
      tl.to(ref, { z: finalRotZ, duration: T_QUEDA, ease: 'power2.out' }, quedaStart);

      // ASSENTA — pequeno quique
      const assentaStart = quedaStart + T_QUEDA;
      tl.to(pos, { y: final.y + 0.2, duration: T_ASSENTA * 0.4, ease: 'power2.out' }, assentaStart);
      tl.to(pos, { y: final.y, duration: T_ASSENTA * 0.6, ease: 'power2.in' }, assentaStart + T_ASSENTA * 0.4);
    });

    // WOBBLE pos-3s — apresentacao final viva
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
        y: dispersao.final[i].y + 0.06,
        duration: 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
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
