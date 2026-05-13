'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';

const COR_OURO = '#f4c430';
const COR_OURO_ESCURO = '#a8740a';
const COR_VERMELHO = '#c0392b';

interface Props {
  /** Ref do <group> da Roda (para ler rotation.z e detectar troca de fatia). */
  rodaRef: React.MutableRefObject<THREE.Group | null>;
  /** Total de premios = total de fatias = total de pinos. */
  totalFatias: number;
}

/**
 * Ponteiro fixo no topo apontando para a borda da roleta. A ponta encosta
 * na linha de divisao entre fatias (onde ficam os pinos dourados). Quando
 * a roda gira e um pino passa pelo ponteiro, o componente roteciona
 * brevemente para o lado, criando o efeito "tac-tac-tac" classico de
 * roda da fortuna.
 *
 * Pivot do balanco: centro do grupo (posicao [0, 2.95]). A ponta do cone
 * vai oscilar para a esquerda/direita quando rotation.z muda.
 */
export function Ponteiro({ rodaRef, totalFatias }: Props) {
  const groupRef = React.useRef<THREE.Group>(null);
  // Indice do "slot" (fatia) que esta sob o ponteiro no frame anterior.
  // Quando muda, dispara o balanco.
  const ultimoSlotRef = React.useRef<number>(0);

  useFrame(() => {
    if (!rodaRef.current || !groupRef.current || totalFatias <= 0) return;
    const rotacao = rodaRef.current.rotation.z;
    const anguloPorFatia = (Math.PI * 2) / totalFatias;
    // Normaliza para [0, 2*PI)
    const normal = ((rotacao % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const slot = Math.floor(normal / anguloPorFatia);

    if (slot !== ultimoSlotRef.current) {
      const diff = slot - ultimoSlotRef.current;
      // Direcao do balanco depende do sentido da rotacao (positiva = anti-horario)
      const direcao = diff > 0 ? -1 : 1;
      ultimoSlotRef.current = slot;

      // Animacao tipo "spring": vai pra um lado e volta com easing back.
      gsap.killTweensOf(groupRef.current.rotation);
      gsap.fromTo(
        groupRef.current.rotation,
        { z: 0.32 * direcao },
        { z: 0, duration: 0.22, ease: 'back.out(2.5)' }
      );
    }
  });

  return (
    // position.y = 2.80: ponta do cone entra no aro da roleta (Y=2.525),
    // dando a impressao de que esta sobre as fatias e batendo nos pinos.
    <group ref={groupRef} position={[0, 2.80, 0.25]}>
      {/* Cone vermelho (corpo) — geometria vira pra baixo via rotation PI no Z */}
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.22, 0.55, 3]} />
        <meshStandardMaterial color={COR_VERMELHO} metalness={0.4} roughness={0.35} />
      </mesh>

      {/* Borda dourada (cone maior atras) */}
      <mesh rotation={[0, 0, Math.PI]} position={[0, 0, -0.01]} scale={[1.18, 1.1, 1]}>
        <coneGeometry args={[0.22, 0.55, 3]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Botao circular dourado na base (topo do ponteiro, longe da roda) */}
      <mesh position={[0, 0.32, 0.02]}>
        <circleGeometry args={[0.18, 32]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.32, 0.04]}>
        <circleGeometry args={[0.11, 32]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}
