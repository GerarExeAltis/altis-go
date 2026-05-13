'use client';
import * as React from 'react';
import * as THREE from 'three';

const COR_OURO = '#f4c430';
const COR_OURO_ESCURO = '#a8740a';
const COR_VERMELHO = '#c0392b';

/**
 * Ponteiro do tipo cassino: flecha/triangulo dourado-vermelho fixo no topo,
 * apontando pra baixo para a roleta. Posicionado um pouco acima da borda
 * (raio da roleta = 2.5 + aro = 2.7), portanto Y ~ 2.75.
 */
export const Ponteiro = React.forwardRef<THREE.Mesh>(function Ponteiro(_, ref) {
  return (
    <group position={[0, 2.85, 0.25]}>
      {/* Corpo do ponteiro (triangulo vermelho apontando pra baixo) */}
      <mesh ref={ref} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.22, 0.55, 3]} />
        <meshStandardMaterial color={COR_VERMELHO} metalness={0.4} roughness={0.35} />
      </mesh>

      {/* Borda dourada do ponteiro (escala maior atras) */}
      <mesh rotation={[0, 0, Math.PI]} position={[0, 0, -0.01]} scale={[1.18, 1.1, 1]}>
        <coneGeometry args={[0.22, 0.55, 3]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Base do ponteiro: circulo dourado tipo botao */}
      <mesh position={[0, 0.18, 0.02]}>
        <circleGeometry args={[0.18, 32]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.18, 0.04]}>
        <circleGeometry args={[0.11, 32]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
});
