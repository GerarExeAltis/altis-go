'use client';
import * as React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useTheme } from 'next-themes';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  premios: PremioDb[];
  raio?: number;
}

// Paleta Altis (segue tema).
const COR_PRIMARY_LIGHT = '#009993';
const COR_PRIMARY_DARK = '#4afad4';
const COR_BRANCO = '#ffffff';

// Tons dourados (cassino).
const COR_OURO = '#f4c430';
const COR_OURO_ESCURO = '#a8740a';
const COR_DETALHE_ESCURO = '#1a1208';

export const Roda = React.forwardRef<THREE.Group, Props>(function Roda(
  { premios, raio = 2.5 }, ref
) {
  const { resolvedTheme } = useTheme();
  const corPrimary = resolvedTheme === 'dark' ? COR_PRIMARY_DARK : COR_PRIMARY_LIGHT;

  const total = premios.length || 1;
  const anguloPorFatia = (Math.PI * 2) / total;

  return (
    <group ref={ref}>
      {/* Fundo: disco escuro como base (da contraste e profundidade) */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[raio * 1.02, 64]} />
        <meshStandardMaterial color={COR_DETALHE_ESCURO} />
      </mesh>

      {/* Fatias coloridas */}
      {premios.map((p, i) => {
        const inicio = i * anguloPorFatia;
        const fim = inicio + anguloPorFatia;
        const cor = i % 2 === 0 ? corPrimary : COR_BRANCO;
        return (
          <Fatia
            key={p.id}
            premio={p}
            inicio={inicio}
            fim={fim}
            raio={raio}
            cor={cor}
            total={total}
          />
        );
      })}

      {/* Linhas separadoras douradas entre fatias */}
      {premios.map((_, i) => {
        const ang = i * anguloPorFatia;
        return (
          <SeparadorFatia key={`sep-${i}`} angulo={ang} raio={raio} />
        );
      })}

      {/* Anel externo dourado (TorusGeometry) */}
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[raio + 0.05, 0.18, 24, 96]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Anel externo (sombra/detalhe interno) */}
      <mesh position={[0, 0, 0.02]}>
        <torusGeometry args={[raio + 0.05, 0.04, 16, 96]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Pinos dourados nas divisas (entre fatias) */}
      {premios.map((_, i) => {
        const ang = i * anguloPorFatia + anguloPorFatia / 2;
        const x = Math.cos(ang) * (raio + 0.05);
        const y = Math.sin(ang) * (raio + 0.05);
        return (
          <mesh key={`pino-${i}`} position={[x, y, 0.18]}>
            <sphereGeometry args={[0.085, 16, 16]} />
            <meshStandardMaterial color={COR_OURO} metalness={0.9} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
});

function Fatia({
  premio, inicio, fim, raio, cor, total,
}: {
  premio: PremioDb;
  inicio: number;
  fim: number;
  raio: number;
  cor: string;
  total: number;
}) {
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, raio, inicio, fim, false);
    shape.lineTo(0, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, [inicio, fim, raio]);

  const anguloCentro = (inicio + fim) / 2;
  const distTexto = raio * 0.62;
  const textX = Math.cos(anguloCentro) * distTexto;
  const textY = Math.sin(anguloCentro) * distTexto;
  const rotacaoTexto = anguloCentro - Math.PI / 2;

  const textColor = cor === COR_BRANCO ? '#1a1208' : '#ffffff';
  const fontSize = Math.max(0.14, Math.min(0.28, 1.6 / total));

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={cor}
          side={THREE.DoubleSide}
          metalness={0.15}
          roughness={0.55}
        />
      </mesh>
      <Text
        position={[textX, textY, 0.02]}
        rotation={[0, 0, rotacaoTexto]}
        fontSize={fontSize}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={raio * 0.7}
        textAlign="center"
        fontWeight={700}
        outlineWidth={fontSize * 0.04}
        outlineColor={textColor === '#ffffff' ? '#000000' : '#ffffff'}
        outlineOpacity={0.25}
      >
        {premio.nome}
      </Text>
    </group>
  );
}

function SeparadorFatia({ angulo, raio }: { angulo: number; raio: number }) {
  const x = Math.cos(angulo) * (raio / 2);
  const y = Math.sin(angulo) * (raio / 2);
  return (
    <mesh position={[x, y, 0.015]} rotation={[0, 0, angulo]}>
      <planeGeometry args={[raio, 0.025]} />
      <meshStandardMaterial color={COR_OURO_ESCURO} side={THREE.DoubleSide} />
    </mesh>
  );
}
