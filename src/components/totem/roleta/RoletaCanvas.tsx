'use client';
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import type * as THREE from 'three';
import type { PremioDb } from '@/lib/totem/types';
import { Roda } from './Roda';
import { Ponteiro } from './Ponteiro';
import { EixoCentro } from './EixoCentro';

interface Props {
  premios: PremioDb[];
  rodaRef: React.MutableRefObject<THREE.Group | null>;
}

export function RoletaCanvas({ premios, rodaRef }: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 5], zoom: 120 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={1.0} />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
      <Roda ref={rodaRef} premios={premios} />
      <EixoCentro />
      <Ponteiro />
    </Canvas>
  );
}
