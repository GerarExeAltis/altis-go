'use client';
import * as React from 'react';
import * as THREE from 'three';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  premios: PremioDb[];
  raio?: number;
}

export const Roda = React.forwardRef<THREE.Group, Props>(function Roda(
  { premios, raio = 2.5 }, ref
) {
  const total = premios.length || 1;
  const anguloPorFatia = (Math.PI * 2) / total;

  return (
    <group ref={ref}>
      {premios.map((p, i) => {
        const inicio = i * anguloPorFatia;
        const fim = inicio + anguloPorFatia;
        const cor = p.cor_hex ?? '#cccccc';
        return (
          <Fatia
            key={p.id}
            inicio={inicio}
            fim={fim}
            raio={raio}
            cor={cor}
          />
        );
      })}
    </group>
  );
});

function Fatia({
  inicio, fim, raio, cor,
}: { inicio: number; fim: number; raio: number; cor: string }) {
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, raio, inicio, fim, false);
    shape.lineTo(0, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, [inicio, fim, raio]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={cor} side={THREE.DoubleSide} />
    </mesh>
  );
}
