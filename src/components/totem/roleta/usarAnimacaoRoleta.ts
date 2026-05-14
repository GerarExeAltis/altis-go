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
 * Animacao em 2 fases:
 *
 * 1) SUSPENSE — comeca a rotacionar rapido em loop infinito assim que
 *    iniciar() e chamado, SEM destino definido. Isso garante que o
 *    cliente veja a roleta em movimento imediatamente depois de tocar
 *    no GIRAR, mesmo que o premioVencedorId ainda nao tenha chegado
 *    via Realtime do backend.
 *
 * 2) REVELACAO — assim que premioVencedorId esta disponivel (vindo do
 *    Realtime), interrompe o loop e dispara a animacao deterministica
 *    que desacelera ate parar com o CENTRO da fatia ganhadora sob o
 *    ponteiro (PI/2).
 *
 * Se o premioVencedorId ja estava disponivel ANTES do iniciar() (fluxo
 * atual normal), as duas fases acontecem em sequencia rapida — o
 * cliente nem percebe a fase 1.
 */
export function usarAnimacaoRoleta({
  premios, premioVencedorId, reduzir, onConcluir,
}: Args): {
  rodaRef: React.MutableRefObject<THREE.Group | null>;
  iniciar: () => void;
} {
  const rodaRef = React.useRef<THREE.Group | null>(null);
  const tweenSuspenseRef = React.useRef<gsap.core.Tween | null>(null);
  const animandoRef = React.useRef(false);
  const reveladoRef = React.useRef(false);

  const revelar = React.useCallback((vencedorId: string) => {
    if (!rodaRef.current) return;
    if (reveladoRef.current) return; // ja revelou — ignora chamadas duplicadas
    reveladoRef.current = true;

    const idx = premios.findIndex((p) => p.id === vencedorId);
    if (idx < 0) {
      // ID inexistente no array local (ex: cache stale). Finaliza sem
      // animar para nao travar o fluxo.
      tweenSuspenseRef.current?.kill();
      onConcluir();
      return;
    }

    const total = premios.length;
    const anguloFatia = (Math.PI * 2) / total;
    const anguloAlvo = -(idx * anguloFatia + anguloFatia / 2) + Math.PI / 2;
    const jitter = (Math.random() - 0.5) * anguloFatia * 0.6;

    // Pega o rotation atual (continuar de onde o suspense parou)
    const rotacaoAtual = rodaRef.current.rotation.z;
    const voltasDesaceleracao = 5;
    // alvo final: muitas voltas a partir da posicao atual + ajuste pro
    // anguloAlvo (mod 2PI). Garante que sempre vai PRA FRENTE (positivo).
    const offsetAlvo = ((anguloAlvo - rotacaoAtual) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const finalZ = rotacaoAtual + voltasDesaceleracao * Math.PI * 2 + offsetAlvo + jitter;

    tweenSuspenseRef.current?.kill();

    if (reduzir) {
      gsap.to(rodaRef.current.rotation, {
        z: anguloAlvo + jitter,
        duration: 0.6,
        ease: 'power1.inOut',
        onComplete: onConcluir,
      });
      return;
    }

    gsap.to(rodaRef.current.rotation, {
      z: finalZ,
      duration: 9,
      ease: 'expo.out',
      onComplete: onConcluir,
    });
  }, [premios, onConcluir, reduzir]);

  const iniciar = React.useCallback(() => {
    if (!rodaRef.current || animandoRef.current) return;
    animandoRef.current = true;
    reveladoRef.current = false;

    // Fase 1: suspense — gira rapido em loop infinito ate ter o vencedor.
    tweenSuspenseRef.current?.kill();
    tweenSuspenseRef.current = gsap.to(rodaRef.current.rotation, {
      z: '+=' + Math.PI * 2,
      duration: 1.2,
      ease: 'none',
      repeat: -1,
    });

    // Se ja existe vencedor, revela imediatamente (fluxo normal).
    // Sem delay — o ease "expo.out" da revelacao ja entrega o efeito
    // de "lancamento" instantaneo seguido de desaceleracao gradual.
    if (premioVencedorId) {
      revelar(premioVencedorId);
    }
  }, [premioVencedorId, revelar]);

  // Se durante o suspense o premioVencedorId chegar, dispara revelacao.
  React.useEffect(() => {
    if (animandoRef.current && premioVencedorId && !reveladoRef.current) {
      revelar(premioVencedorId);
    }
  }, [premioVencedorId, revelar]);

  // Reset quando o componente "esquece" o vencedor (volta pra attract).
  React.useEffect(() => {
    if (!premioVencedorId) {
      animandoRef.current = false;
      reveladoRef.current = false;
      tweenSuspenseRef.current?.kill();
      tweenSuspenseRef.current = null;
    }
  }, [premioVencedorId]);

  return { rodaRef, iniciar };
}
