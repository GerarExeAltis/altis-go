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

/**
 * Anima 2 dados que terminam na mesma face (face do premio). O hook
 * retorna as rotacoes correntes em formato array para alimentar
 * DadoCanvas (uma por dado).
 *
 * 2 fases:
 *  1) suspense — tumble continuo em loop quando iniciar() e chamado.
 *  2) revelacao — aplica voltas extras + assenta na rotacao alvo da
 *     face que corresponde ao premio escolhido pelo backend.
 *
 * Cada dado recebe valores ligeiramente diferentes (multiplicadores
 * 1.0 e 1.15) para nao parecerem espelhados — sensacao de dois objetos
 * independentes balancando, mas ambos chegam na mesma face.
 */
export function usarAnimacaoDado({
  premios, premioVencedorId, reduzir, onConcluir,
}: Args): {
  rotations: Array<[number, number, number]>;
  iniciar: () => void;
  reset: () => void;
} {
  const [rotations, setRotations] = React.useState<Array<[number, number, number]>>([
    [0, 0, 0],
    [0, 0, 0],
  ]);
  const rotRefs = React.useRef<[RotState, RotState]>([
    { x: 0, y: 0, z: 0 },
    { x: 0.3, y: 0.2, z: 0.1 },
  ]);
  const tweensRef = React.useRef<gsap.core.Tween[]>([]);
  const animandoRef = React.useRef(false);
  const reveladoRef = React.useRef(false);

  const aplicar = React.useCallback(() => {
    const [a, b] = rotRefs.current;
    setRotations([[a.x, a.y, a.z], [b.x, b.y, b.z]]);
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
    aplicar();
  }, [matar, aplicar]);

  const revelar = React.useCallback((vencedorId: string) => {
    if (reveladoRef.current) return;
    reveladoRef.current = true;

    const premio = premios.find((p) => p.id === vencedorId);
    if (!premio) {
      matar();
      onConcluir();
      return;
    }
    const face = faceDoPremio(premio);
    const [rx, ry, rz] = ROTACOES_FACES[face] ?? [0, 0, 0];

    // Voltas extras a partir da rotacao ATUAL — preserva fluidez sem
    // jump. Cada dado tem multiplicador diferente em Y para nao parecer
    // espelhado.
    const voltas = 3;
    const dur = reduzir ? 0.5 : 3.2;
    const ease = reduzir ? 'power1.inOut' : 'power3.out';

    matar();
    rotRefs.current.forEach((ref, i) => {
      const yMult = i === 0 ? 1 : 1.15;
      // Ajusta rotacao atual para multiplo de 2PI mais proximo + alvo
      const finalX = ref.x + voltas * Math.PI * 2
                     + (((rx - ref.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalY = ref.y + voltas * Math.PI * 2 * yMult
                     + (((ry - ref.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const finalZ = ref.z + voltas * Math.PI * 2
                     + (((rz - ref.z) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const tw = gsap.to(ref, {
        x: finalX, y: finalY, z: finalZ,
        duration: dur,
        ease,
        onUpdate: aplicar,
        onComplete: i === 0 ? onConcluir : undefined,
      });
      tweensRef.current.push(tw);
    });
  }, [premios, onConcluir, reduzir, aplicar, matar]);

  const iniciar = React.useCallback(() => {
    if (animandoRef.current) return;
    animandoRef.current = true;
    reveladoRef.current = false;

    // Suspense — tumble continuo. Os 2 dados giram em velocidades
    // ligeiramente diferentes para sensacao de naturalidade.
    matar();
    rotRefs.current.forEach((ref, i) => {
      const mult = i === 0 ? 1 : 1.2;
      const tw = gsap.to(ref, {
        x: '+=' + Math.PI * 2 * mult,
        y: '+=' + Math.PI * 2 * 1.3 * mult,
        z: '+=' + Math.PI * 2 * 0.7 * mult,
        duration: 1.0,
        ease: 'none',
        repeat: -1,
        onUpdate: aplicar,
      });
      tweensRef.current.push(tw);
    });

    if (premioVencedorId) {
      revelar(premioVencedorId);
    }
  }, [premioVencedorId, revelar, aplicar, matar]);

  // Detecta vencedor durante suspense — dispara revelacao.
  React.useEffect(() => {
    if (animandoRef.current && premioVencedorId && !reveladoRef.current) {
      revelar(premioVencedorId);
    }
  }, [premioVencedorId, revelar]);

  // Reset automatico quando volta pra attract.
  React.useEffect(() => {
    if (!premioVencedorId) {
      reset();
    }
  }, [premioVencedorId, reset]);

  return { rotations, iniciar, reset };
}
