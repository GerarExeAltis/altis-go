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
 * Sequencia da animacao apos o copo sair de cena (controlada por
 * SwipeAreaDados): exatamente 3 SEGUNDOS de rotacao+giro com os dados
 * encolhendo de scale=1.6 -> 1.0 (efeito zoom-out enquanto rolam).
 * Apos os 3s, dados param na face do premio com leve inclinacao e
 * giro suave continuo (bobbing).
 *
 * O hook retorna rotations[], positions[] e scales[] que o
 * DadoCanvas aplica.
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
  const [scales, setScales] = React.useState<number[]>([1, 1]);

  const rotRefs = React.useRef<[RotState, RotState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0.3, y: 0.2, z: 0.1 },
  ]);
  const posRefs = React.useRef<[PosState, PosState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ]);
  const scaleRefs = React.useRef<[{ s: number }, { s: number }]>([
    { s: 1 }, { s: 1 },
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
    scaleRefs.current = [{ s: 1 }, { s: 1 }];
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

    // Estado inicial dos dados: posicionados onde estava o copo
    // (centro-baixo da tela), com escala 1.6x para "estourarem" na cena
    // quando o copo sai. Rotacao inicial aleatoria para nao parecer
    // estatico.
    rotRefs.current[0] = { x: Math.random() * 1.5, y: Math.random() * 1.5, z: Math.random() * 1.0 };
    rotRefs.current[1] = { x: Math.random() * 1.5, y: Math.random() * 1.5, z: Math.random() * 1.0 };
    posRefs.current[0] = { x: -0.4, y: 0.6, z: 0 };
    posRefs.current[1] = { x: 0.4, y: 0.6, z: 0 };
    scaleRefs.current[0] = { s: 1.6 };
    scaleRefs.current[1] = { s: 1.6 };
    aplicar();

    const tl = gsap.timeline({
      onUpdate: aplicar,
      onComplete: onConcluir,
    });

    if (reduzir) {
      // Acessibilidade: vai direto ao alvo, sem giros longos
      rotRefs.current.forEach((ref, i) => {
        tl.to(ref, {
          x: rxAlvo, y: ryAlvo, z: rzAlvo, duration: 0.5, ease: 'power1.inOut',
        }, 0);
        tl.to(posRefs.current[i], {
          x: i === 0 ? -0.8 : 0.8, y: 0, duration: 0.5, ease: 'power1.inOut',
        }, 0);
        tl.to(scaleRefs.current[i], { s: 1, duration: 0.5 }, 0);
      });
      tweensRef.current.push(tl);
      return;
    }

    // SEQUENCIA PRINCIPAL: 3 segundos exatos de rotacao+giro+zoom-out.
    // Apos os 3s, ainda ha uma fase curta (~1.2s) de "inclinacao e giro
    // leve" - dado se acomoda balancando ate parar de fato.
    const DURACAO_ROLAGEM = 3.0;
    const voltas = 6; // rotacoes completas em cada eixo durante os 3s

    rotRefs.current.forEach((ref, i) => {
      const yMult = i === 0 ? 1 : 1.15;
      const xMult = i === 0 ? 1 : 0.9;
      const baseX = i === 0 ? -0.8 : 0.8;

      const finalX = ref.x + voltas * Math.PI * 2 * xMult
                     + (((rxAlvo - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalY = ref.y + voltas * Math.PI * 2 * yMult
                     + (((ryAlvo - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalZ = ref.z + voltas * Math.PI * 2
                     + (((rzAlvo - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const pos = posRefs.current[i];
      const scl = scaleRefs.current[i];

      // FASE 1 (3s): rotacao + giro + zoom-out gradual + acomodacao na posicao final
      tl.to(ref, {
        x: finalX, y: finalY, z: finalZ,
        duration: DURACAO_ROLAGEM,
        ease: 'power2.out',
      }, 0);
      tl.to(pos, {
        x: baseX, y: 0, z: 0,
        duration: DURACAO_ROLAGEM,
        ease: 'power2.out',
      }, 0);
      tl.to(scl, {
        s: 1.0,
        duration: DURACAO_ROLAGEM,
        ease: 'power1.out',
      }, 0);

      // FASE 2 (1.2s apos 3s): inclinacao leve + giro suave para o
      // dado se acomodar visualmente (small wobble) sem deixar a
      // face alvo. Termina no estado final estavel.
      tl.to(ref, {
        x: '+=' + 0.18 * (i === 0 ? 1 : -1),
        z: '+=' + 0.12 * (i === 0 ? -1 : 1),
        duration: 0.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
      }, DURACAO_ROLAGEM);
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
