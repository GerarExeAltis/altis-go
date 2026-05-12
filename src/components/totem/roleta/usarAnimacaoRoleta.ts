'use client';
import * as React from 'react';
import gsap from 'gsap';
import type * as THREE from 'three';
import type { PremioDb } from '@/lib/totem/types';

interface Args {
  premios: PremioDb[];
  premioVencedorId: string | null;
  reduzir: boolean;
  onConcluir: () => void;
}

/**
 * Retorna ref para o <group> da roda + função para disparar animação determinística.
 * A animação aterrissa no ângulo central da fatia do premio_sorteado_id.
 */
export function usarAnimacaoRoleta({
  premios, premioVencedorId, reduzir, onConcluir,
}: Args): {
  rodaRef: React.MutableRefObject<THREE.Group | null>;
  iniciar: () => void;
} {
  const rodaRef = React.useRef<THREE.Group | null>(null);

  const iniciar = React.useCallback(() => {
    const idx = premios.findIndex((p) => p.id === premioVencedorId);
    if (idx < 0 || !rodaRef.current) {
      onConcluir();
      return;
    }
    const total = premios.length;
    const anguloFatia = (Math.PI * 2) / total;
    const anguloAlvo = -(idx * anguloFatia + anguloFatia / 2) + Math.PI / 2;
    const voltas = 6 + Math.random() * 2;
    const jitter = (Math.random() - 0.5) * anguloFatia * 0.6;
    const final = anguloAlvo + voltas * Math.PI * 2 + jitter;

    if (reduzir) {
      gsap.to(rodaRef.current.rotation, {
        z: anguloAlvo + jitter,
        duration: 0.8,
        ease: 'power1.inOut',
        onComplete: onConcluir,
      });
      return;
    }

    gsap.to(rodaRef.current.rotation, {
      z: final,
      duration: 5,
      ease: 'power3.out',
      onComplete: onConcluir,
    });
  }, [premios, premioVencedorId, reduzir, onConcluir]);

  return { rodaRef, iniciar };
}
