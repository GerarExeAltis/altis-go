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
 * Animacao estilo "Duelo de Dados" / Yahtzee:
 *
 *   FASE 1 — Saida do copo (350ms): dados saem voando pra cima do
 *            canto superior esquerdo (posicao do copo) ate o centro
 *            superior da area, com bastante rotacao inicial.
 *   FASE 2 — Queda parabolica (500ms): dados caem em arcos cruzados
 *            (um vai pela direita, outro pela esquerda — eles SE
 *            CRUZAM no meio do arco, dando o efeito de colisao).
 *   FASE 3 — Colisao + ricochete (250ms): no ponto de cruzamento,
 *            cada dado ganha uma deflexao lateral oposta + rotacao
 *            extra (sensacao de "bateu e quicou").
 *   FASE 4 — Quica no chao (400ms): Y oscila 2x diminuindo.
 *   FASE 5 — Assenta (1.2s): rotacao final converge na face do premio.
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
    [0, 0, 0], [0, 0, 0],
  ]);
  const [positions, setPositions] = React.useState<Array<[number, number, number]>>([
    [0, 0, 0], [0, 0, 0],
  ]);

  // Posicoes "dentro do copo": canto superior esquerdo do canvas
  // (Y alto, X negativo). Quando o lance comeca, partem dali.
  const POS_DENTRO_COPO: PosState = { x: -3.5, y: 3, z: 0 };

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

    // Posicao inicial: dentro do copo. Forca as refs antes da timeline.
    rotRefs.current[0] = { x: 0, y: 0, z: 0 };
    rotRefs.current[1] = { x: 0.3, y: 0.2, z: 0.1 };
    posRefs.current[0] = { ...POS_DENTRO_COPO };
    posRefs.current[1] = { ...POS_DENTRO_COPO };
    aplicar();

    const tl = gsap.timeline({
      onUpdate: aplicar,
      onComplete: onConcluir,
    });

    if (reduzir) {
      // Acessibilidade: vai direto ao alvo
      rotRefs.current.forEach((ref, i) => {
        tl.to(ref, {
          x: rxAlvo, y: ryAlvo, z: rzAlvo,
          duration: 0.4, ease: 'power1.inOut',
        }, 0);
        tl.to(posRefs.current[i], {
          x: i === 0 ? -0.8 : 0.8, y: 0, z: 0,
          duration: 0.4, ease: 'power1.out',
        }, 0);
      });
      tweensRef.current.push(tl);
      return;
    }

    const voltas = 4;
    rotRefs.current.forEach((ref, i) => {
      const yMult = i === 0 ? 1 : 1.15;
      const xMult = i === 0 ? 1 : 0.9;
      const baseX = i === 0 ? -0.8 : 0.8; // posicao final de assento

      const finalX = ref.x + voltas * Math.PI * 2 * xMult
                     + (((rxAlvo - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalY = ref.y + voltas * Math.PI * 2 * yMult
                     + (((ryAlvo - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalZ = ref.z + voltas * Math.PI * 2
                     + (((rzAlvo - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const pos = posRefs.current[i];

      // FASE 1 — saida do copo (X vai do copo ate o centro-superior, Y desce um pouco)
      const meioX1 = i === 0 ? 1.5 : -1.5;  // arco trocado entre os dados
      tl.to(pos, {
        x: i === 0 ? 0.5 : -0.5, y: 2.2, z: 0,
        duration: 0.35, ease: 'power2.out',
      }, 0);
      tl.to(ref, {
        x: ref.x + Math.PI * 1.2 * xMult,
        y: ref.y + Math.PI * 0.8 * yMult,
        z: ref.z + Math.PI * 0.4,
        duration: 0.35, ease: 'power1.out',
      }, 0);

      // FASE 2 — voo cruzado (cai em arco, X cruza com o outro dado)
      tl.to(pos, {
        x: meioX1, y: 0.5, z: 0,
        duration: 0.5, ease: 'power2.in',
      }, 0.35);
      tl.to(ref, {
        x: ref.x + Math.PI * 1.2 * xMult + Math.PI * 1.8 * xMult,
        y: ref.y + Math.PI * 0.8 * yMult + Math.PI * 1.5 * yMult,
        z: ref.z + Math.PI * 0.4 + Math.PI * 0.8,
        duration: 0.5, ease: 'none',
      }, 0.35);

      // FASE 3 — COLISAO + ricochete (X muda de direcao bruscamente, rotacao spike)
      const ricocheteX = i === 0 ? meioX1 - 1.0 : meioX1 + 1.0;
      tl.to(pos, {
        x: ricocheteX, y: 0.8, z: 0,
        duration: 0.18, ease: 'power3.out',
      }, 0.85);
      tl.to(ref, {
        x: '+=' + Math.PI * 0.6 * (i === 0 ? -1 : 1),
        y: '+=' + Math.PI * 0.5,
        z: '+=' + Math.PI * 0.4 * (i === 0 ? 1 : -1),
        duration: 0.18, ease: 'power2.out',
      }, 0.85);

      // FASE 4 — quica no chao (Y oscila duas vezes)
      tl.to(pos, {
        y: 0, duration: 0.2, ease: 'power2.in',
      }, 1.03);
      tl.to(pos, {
        y: 0.4, duration: 0.15, ease: 'power2.out',
      }, 1.23);
      tl.to(pos, {
        y: 0, duration: 0.15, ease: 'power2.in',
      }, 1.38);
      tl.to(pos, {
        y: 0.15, duration: 0.1, ease: 'power2.out',
      }, 1.53);
      tl.to(pos, {
        y: 0, duration: 0.1, ease: 'power2.in',
      }, 1.63);

      // FASE 5 — assenta + rotacao final na face alvo + posicao base
      tl.to(pos, {
        x: baseX, z: 0, duration: 0.8, ease: 'power2.out',
      }, 1.5);
      tl.to(ref, {
        x: finalX, y: finalY, z: finalZ,
        duration: 1.2, ease: 'power3.out',
      }, 1.5);
    });

    tweensRef.current.push(tl);
  }, [premios, onConcluir, reduzir, aplicar, matar, POS_DENTRO_COPO]);

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

  return { rotations, positions, iniciar, reset };
}
