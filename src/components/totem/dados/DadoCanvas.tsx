'use client';
import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ROTACOES_FACES: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

function pipsPorFace(valor: number): Array<[number, number]> {
  const o = 0.28;
  switch (valor) {
    case 1: return [[0, 0]];
    case 2: return [[-o, -o], [o, o]];
    case 3: return [[-o, -o], [0, 0], [o, o]];
    case 4: return [[-o, -o], [-o, o], [o, -o], [o, o]];
    case 5: return [[-o, -o], [-o, o], [0, 0], [o, -o], [o, o]];
    case 6: return [[-o, -o], [-o, 0], [-o, o], [o, -o], [o, 0], [o, o]];
    default: return [];
  }
}

function FacePips({ valor, normal, rotation }: {
  valor: number;
  normal: [number, number, number];
  rotation: [number, number, number];
}) {
  const pips = pipsPorFace(valor);
  const offset = 0.501;
  return (
    <group rotation={rotation} position={[normal[0] * offset, normal[1] * offset, normal[2] * offset]}>
      {pips.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <circleGeometry args={[0.07, 24]} />
          <meshStandardMaterial color="#0f1d24" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function CuboDado() {
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fafafa" roughness={0.4} metalness={0.05} />
      </mesh>
      <FacePips valor={1} normal={[0, 1, 0]}  rotation={[-Math.PI / 2, 0, 0]} />
      <FacePips valor={6} normal={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <FacePips valor={2} normal={[0, 0, 1]}  rotation={[0, 0, 0]} />
      <FacePips valor={5} normal={[0, 0, -1]} rotation={[0, Math.PI, 0]} />
      <FacePips valor={3} normal={[1, 0, 0]}  rotation={[0, Math.PI / 2, 0]} />
      <FacePips valor={4} normal={[-1, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </>
  );
}

function Dado({ rotation, position }: {
  rotation: [number, number, number];
  position: [number, number, number];
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  React.useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    groupRef.current.position.set(position[0], position[1], position[2]);
  }, [rotation, position]);

  return (
    <group ref={groupRef}>
      <CuboDado />
    </group>
  );
}

function DadoAutoRotate({ position, speedScale = 1, hover = false }: {
  position: [number, number, number];
  speedScale?: number;
  hover?: boolean;
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  const t = React.useRef(0);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += delta * 0.5 * speedScale;
    groupRef.current.rotation.y += delta * 0.7 * speedScale;
    if (hover) {
      // Pequeno bobbing vertical — sensacao de "flutuando na mao"
      t.current += delta;
      groupRef.current.position.y = position[1] + Math.sin(t.current * 1.8) * 0.08;
    } else {
      groupRef.current.position.y = position[1];
    }
    groupRef.current.position.x = position[0];
    groupRef.current.position.z = position[2];
  });

  return (
    <group ref={groupRef}>
      <CuboDado />
    </group>
  );
}

/**
 * Sombra plana no chao (cinza translucido). Acompanha o dado em X/Z
 * mas fica fixa em Y=0 — quando o dado pula, a sombra encolhe um
 * pouco (efeito de altura). Visualmente reforca a sensacao de fisica.
 */
function SombraDado({ dadoX, dadoY, dadoZ, baseX, baseZ }: {
  dadoX: number; dadoY: number; dadoZ: number;
  baseX: number; baseZ: number;
}) {
  // Esconde a sombra se o dado esta fora da area visivel (ex: dentro do
  // copo antes do lance). |x| > 2.5 ou y > 2.5 sao posicoes "fora de cena".
  const foraCena = Math.abs(dadoX) > 2.5 || dadoY > 2.5;
  if (foraCena) return null;

  const altura = Math.max(0, dadoY);
  const escala = Math.max(0.4, 1 - altura * 0.35);
  const opacidade = Math.max(0.15, 0.45 - altura * 0.15);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[baseX + dadoX, -0.55, baseZ + dadoZ]}
      scale={[escala, escala, escala]}
    >
      <circleGeometry args={[0.55, 32]} />
      <meshBasicMaterial color="#000000" transparent opacity={opacidade} />
    </mesh>
  );
}

interface Props {
  /** Rotacoes de cada dado. */
  rotations?: Array<[number, number, number]>;
  /** Posicoes (offsets) de cada dado em relacao a sua base. */
  positions?: Array<[number, number, number]>;
  /** Quando true, dados giram em loop sem destino. */
  autoRotate?: boolean;
  /** Quantos dados renderizar (1 ou 2). Default 2. */
  count?: 1 | 2;
  /** Zoom da camera ortografica. */
  zoom?: number;
  /** Velocidade relativa do auto-rotate (1=normal). */
  autoRotateSpeed?: number;
  /** Quando true, dados flutuam levemente em Y (visual "na mao"). */
  hover?: boolean;
}

export function DadoCanvas({
  rotations,
  positions,
  autoRotate = false,
  count = 2,
  zoom = 100,
  autoRotateSpeed = 1,
  hover = false,
}: Props) {
  // Posicoes base: 1 centrado, 2 lado a lado
  const basePositions: Array<[number, number, number]> =
    count === 1 ? [[0, 0, 0]] : [[-0.8, 0, 0], [0.8, 0, 0]];

  const rots = rotations ?? basePositions.map(() => [0, 0, 0] as [number, number, number]);
  const offs = positions ?? basePositions.map(() => [0, 0, 0] as [number, number, number]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0 }}>
      <Canvas
        orthographic
        camera={{ position: [2.4, 2.4, 2.4], zoom }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block',
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={0.9} />
        <directionalLight position={[-3, -2, -4]} intensity={0.3} />
        <pointLight position={[0, 0, 3]} intensity={0.4} color="#4afad4" />

        {basePositions.map((base, i) => {
          const finalPos: [number, number, number] = [
            base[0] + (offs[i]?.[0] ?? 0),
            base[1] + (offs[i]?.[1] ?? 0),
            base[2] + (offs[i]?.[2] ?? 0),
          ];
          return (
            <React.Fragment key={i}>
              <SombraDado
                dadoX={offs[i]?.[0] ?? 0}
                dadoY={offs[i]?.[1] ?? 0}
                dadoZ={offs[i]?.[2] ?? 0}
                baseX={base[0]}
                baseZ={base[2]}
              />
              {autoRotate ? (
                <DadoAutoRotate
                  position={finalPos}
                  speedScale={i === 0 ? autoRotateSpeed : autoRotateSpeed * 1.15}
                  hover={hover}
                />
              ) : (
                <Dado rotation={rots[i] ?? [0, 0, 0]} position={finalPos} />
              )}
            </React.Fragment>
          );
        })}
      </Canvas>
    </div>
  );
}
