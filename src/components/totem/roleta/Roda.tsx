'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useTheme } from 'next-themes';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  premios: PremioDb[];
  raio?: number;
}

// Paleta Altis fixa (igual aos valores de --primary em globals.css).
// Light (tema claro): bg branco -> usa primary ESCURO + branco
// Dark  (tema escuro): bg escuro -> usa primary CLARO + branco
const COR_PRIMARY_LIGHT = '#009993';
const COR_PRIMARY_DARK = '#4afad4';
const COR_BRANCO = '#ffffff';

export const Roda = React.forwardRef<THREE.Group, Props>(function Roda(
  { premios, raio = 2.5 }, ref
) {
  const { resolvedTheme } = useTheme();
  const corPrimary = resolvedTheme === 'dark' ? COR_PRIMARY_DARK : COR_PRIMARY_LIGHT;

  const total = premios.length || 1;
  const anguloPorFatia = (Math.PI * 2) / total;

  return (
    <group ref={ref}>
      {premios.map((p, i) => {
        const inicio = i * anguloPorFatia;
        const fim = inicio + anguloPorFatia;
        // Alterna primary/branco por indice (independe de cor_hex do premio).
        const cor = i % 2 === 0 ? corPrimary : COR_BRANCO;
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
