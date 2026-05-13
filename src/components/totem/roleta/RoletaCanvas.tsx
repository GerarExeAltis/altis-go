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
  /**
   * Zoom da camera ortografica. Default 110 (totem fullscreen).
   * Para containers menores use valores menores — regra empirica:
   *   container 380px -> zoom 60
   *   container 480px -> zoom 75
   *   container 800px -> zoom 110 (default)
   * Calculo: zoom ~ container_px / 6.5
   */
  zoom?: number;
}

export function RoletaCanvas({ premios, rodaRef, zoom = 110 }: Props) {
  // Wrapper com tamanho explicito + position:relative garante que o R3F
  // (que mede o parent via ResizeObserver) capture as dimensoes corretas
  // mesmo quando renderizado dentro de portal/modal com animacao de zoom.
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        gl={{ antialias: true }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 50 } }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={0.9} />
        <directionalLight position={[-3, -2, 4]} intensity={0.35} />
        <pointLight position={[0, 0, 3]} intensity={0.5} color="#ffe7a0" />

        <Roda ref={rodaRef} premios={premios} />
        <EixoCentro />
        <Ponteiro rodaRef={rodaRef} totalFatias={premios.length} />
      </Canvas>
    </div>
  );
}
