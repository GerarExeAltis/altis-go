'use client';
import * as React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  premios: PremioDb[];
  raio?: number;
}

// Cor identidade Altis (FIXA — nao muda entre temas claro/escuro).
// Tom claro (#4afad4) para ficar vibrante e atrativo, independente do
// tema do operador.
const COR_PRIMARY = '#4afad4';
const COR_BRANCO = '#ffffff';

// Tons dourados (cassino).
const COR_OURO = '#f4c430';
const COR_OURO_ESCURO = '#a8740a';
const COR_DETALHE_ESCURO = '#1a1208';

export const Roda = React.forwardRef<THREE.Group, Props>(function Roda(
  { premios, raio = 2.5 }, ref
) {

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
        const cor = i % 2 === 0 ? COR_PRIMARY : COR_BRANCO;
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

      {/* Pinos dourados nas divisas (linhas que separam cada fatia).
          Posicionados em ang = i * anguloPorFatia (sem somar metade) —
          exatamente onde fica o separador. O ponteiro bate em cada um
          quando a roda gira. */}
      {premios.map((_, i) => {
        const ang = i * anguloPorFatia;
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
  // Texto posicionado a 70% do raio (mais perto da borda, igual cassino).
  const distTexto = raio * 0.70;
  const textX = Math.cos(anguloCentro) * distTexto;
  const textY = Math.sin(anguloCentro) * distTexto;
  // Rotacao radial-lendo-para-o-centro (estilo wheel of fortune):
  // a base da letra fica perto da borda e o topo aponta pro miolo.
  const rotacaoTexto = anguloCentro + Math.PI;

  // Cor do texto: sempre escuro (contrasta tanto com primary claro
  // quanto com branco — ambas as fatias sao claras agora).
  const textColor = '#1a1208';
  const fontSize = Math.max(0.14, Math.min(0.26, 1.5 / total));

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
        maxWidth={raio * 0.55}
        textAlign="center"
        fontWeight={700}
        outlineWidth={fontSize * 0.04}
        outlineColor="#ffffff"
        outlineOpacity={0.35}
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
