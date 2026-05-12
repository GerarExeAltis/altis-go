'use client';
import * as React from 'react';
import type * as THREE from 'three';

/** Triângulo fixo no topo, apontando pra baixo. */
export const Ponteiro = React.forwardRef<THREE.Mesh>(function Ponteiro(_, ref) {
  return (
    <mesh ref={ref} position={[0, 2.7, 0.1]} rotation={[0, 0, Math.PI]}>
      <coneGeometry args={[0.2, 0.4, 3]} />
      <meshStandardMaterial color="#e74c3c" />
    </mesh>
  );
});
