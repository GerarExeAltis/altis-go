'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { PremioDb } from '@/lib/totem/types';

interface Props {
  premios: PremioDb[];
  raio?: number;
}

// Paleta exclusivamente Altis — alterna 3 tons da identidade do sistema.
// Tudo derivado do primary (#4afad4) + branco, sem cores aleatorias.
const COR_PRIMARY_CLARO = '#4afad4';   // primary tom claro (identidade)
const COR_PRIMARY_ESCURO = '#009993';  // primary tom escuro (contraste forte)
const COR_BRANCO = '#ffffff';

// Sequencia de 6 tons em ciclo — sempre Altis:
//   claro -> branco -> escuro -> branco -> claro -> branco ...
const PALETA = [
  COR_PRIMARY_CLARO,
  COR_BRANCO,
  COR_PRIMARY_ESCURO,
  COR_BRANCO,
  COR_PRIMARY_CLARO,
  COR_BRANCO,
];

function corFatia(i: number): string {
  return PALETA[i % PALETA.length];
}

// Aro estilo Stake/moderno — grafite escuro neutro (nao compete com as
// fatias coloridas). Pinos ficam em primary saturado para identidade.
const COR_ARO = '#2c3e50';         // grafite escuro (aro principal)
const COR_ARO_BISEL = '#1a2733';    // ainda mais escuro (sombra interna)
const COR_PINO = '#4afad4';         // primary saturado (pinos = identidade Altis)
const COR_DETALHE_ESCURO = '#0a1d1c';

// Aliases para nao quebrar o restante do arquivo (Lampadas/separador usam).
const COR_OURO = COR_ARO;
const COR_OURO_ESCURO = COR_ARO_BISEL;

export const Roda = React.forwardRef<THREE.Group, Props>(function Roda(
  { premios, raio = 2.5 }, ref
) {
  const total = premios.length || 1;
  const anguloPorFatia = (Math.PI * 2) / total;
  // Quantidade de "lampadas" no aro (a cada 30 graus = 12 luzes).
  const totalLampadas = 12;

  return (
    <group ref={ref}>
      {/* Glow sutil ao redor da roleta (no fundo escuro fica visivel) */}
      <mesh position={[0, 0, -0.06]}>
        <circleGeometry args={[raio * 1.18, 64]} />
        <meshBasicMaterial color={COR_PRIMARY_CLARO} transparent opacity={0.08} />
      </mesh>

      {/* Fundo: disco escuro como base (contraste interno) */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[raio * 1.02, 64]} />
        <meshStandardMaterial color={COR_DETALHE_ESCURO} />
      </mesh>

      {/* Fatias coloridas (alternancia da paleta) */}
      {premios.map((p, i) => {
        const inicio = i * anguloPorFatia;
        const fim = inicio + anguloPorFatia;
        return (
          <Fatia
            key={p.id}
            premio={p}
            inicio={inicio}
            fim={fim}
            raio={raio}
            cor={corFatia(i)}
            total={total}
          />
        );
      })}

      {/* Linhas separadoras douradas entre fatias */}
      {premios.map((_, i) => {
        const ang = i * anguloPorFatia;
        return <SeparadorFatia key={`sep-${i}`} angulo={ang} raio={raio} />;
      })}

      {/* Anel interno escuro entre fatias e aro dourado (definicao) */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[raio, raio + 0.04, 96]} />
        <meshStandardMaterial color={COR_DETALHE_ESCURO} side={THREE.DoubleSide} />
      </mesh>

      {/* Anel externo dourado (grande) */}
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[raio + 0.05, 0.18, 24, 96]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Anel externo (sombra/detalhe interno escuro do bisel) */}
      <mesh position={[0, 0, 0.02]}>
        <torusGeometry args={[raio + 0.05, 0.04, 16, 96]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Pinos PRIMARY nas divisas entre fatias (identidade Altis) */}
      {premios.map((_, i) => {
        const ang = i * anguloPorFatia;
        const x = Math.cos(ang) * (raio + 0.05);
        const y = Math.sin(ang) * (raio + 0.05);
        return (
          <mesh key={`pino-${i}`} position={[x, y, 0.18]}>
            <sphereGeometry args={[0.085, 16, 16]} />
            <meshStandardMaterial
              color={COR_PINO}
              emissive={COR_PINO}
              emissiveIntensity={0.4}
              metalness={0.3}
              roughness={0.3}
            />
          </mesh>
        );
      })}

      {/* Lampadas piscando no aro (estilo Vegas) */}
      <Lampadas total={totalLampadas} raio={raio + 0.05} />
    </group>
  );
});

/* ── Componente: Lampadas piscando no aro ────────────────────────────── */

function Lampadas({ total, raio }: { total: number; raio: number }) {
  const refs = React.useRef<(THREE.Mesh | null)[]>([]);
  const tRef = React.useRef(0);

  useFrame((_, delta) => {
    tRef.current += delta * 4; // velocidade do piscar
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      // Cada lampada pisca defasada (efeito 'chase' ao redor da roleta).
      const fase = (tRef.current + i * 0.6) % (Math.PI * 2);
      const intensidade = (Math.sin(fase) + 1) / 2; // [0,1]
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + intensidade * 1.6;
      // Levemente muda escala tambem (pulse)
      const escala = 0.95 + intensidade * 0.15;
      mesh.scale.setScalar(escala);
    });
  });

  return (
    <>
      {Array.from({ length: total }).map((_, i) => {
        // Lampadas POR FORA do aro dourado (na orla mais externa).
        const ang = (i / total) * Math.PI * 2 + Math.PI / total;
        const distancia = raio + 0.32;
        const x = Math.cos(ang) * distancia;
        const y = Math.sin(ang) * distancia;
        return (
          <mesh
            key={`lamp-${i}`}
            ref={(m) => {
              refs.current[i] = m;
            }}
            position={[x, y, 0.1]}
          >
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={COR_PRIMARY_CLARO}
              emissiveIntensity={0.6}
              metalness={0.2}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </>
  );
}

/* ── Componente: Fatia ──────────────────────────────────────────────── */

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
  const distTexto = raio * 0.70;
  const textX = Math.cos(anguloCentro) * distTexto;
  const textY = Math.sin(anguloCentro) * distTexto;
  const rotacaoTexto = anguloCentro + Math.PI;

  // Cor do texto: escuro Altis sobre claro/branco, branco sobre primary escuro.
  const ehPrimaryEscuro = cor === COR_PRIMARY_ESCURO;
  const textColor = ehPrimaryEscuro ? '#ffffff' : '#003834';
  const outlineColor = ehPrimaryEscuro ? '#003834' : '#ffffff';

  const fontSize = Math.max(0.14, Math.min(0.26, 1.5 / total));

  return (
    <group>
      <mesh geometry={geometry}>
        {/* MeshBasicMaterial = cor pura, nao reage a iluminacao da cena.
            Garante que o branco fique branco mesmo e o primary fique
            saturado, sem ficar acinzentado pelo clearcoat refletindo
            o ambiente escuro. */}
        <meshBasicMaterial color={cor} side={THREE.DoubleSide} />
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
        outlineWidth={fontSize * 0.06}
        outlineColor={outlineColor}
        outlineOpacity={0.5}
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
