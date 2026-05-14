'use client';
import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Dado 3D estilo cassino (1 ou 2 dados lado a lado).
 *
 * Convencao das faces:
 *   1 -> +Y (cima)   6 -> -Y (baixo)
 *   2 -> +Z (frente) 5 -> -Z (tras)
 *   3 -> +X (direita) 4 -> -X (esquerda)
 *
 * Rotacoes para deixar cada face VOLTADA pra cima (+Y).
 */
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
      <mesh>
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
  position?: [number, number, number];
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  React.useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
  }, [rotation]);

  return (
    <group ref={groupRef} position={position}>
      <CuboDado />
    </group>
  );
}

function DadoAutoRotate({ position, speedScale = 1 }: {
  position?: [number, number, number];
  speedScale?: number;
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += delta * 0.5 * speedScale;
    groupRef.current.rotation.y += delta * 0.7 * speedScale;
  });

  return (
    <group ref={groupRef} position={position}>
      <CuboDado />
    </group>
  );
}

interface Props {
  /** Rotacoes de cada dado (1 ou 2). Ignorada se autoRotate=true. */
  rotations?: Array<[number, number, number]>;
  /** Quando true, dados giram em loop sem destino. */
  autoRotate?: boolean;
  /** Quantos dados renderizar (1 ou 2). Default 2. */
  count?: 1 | 2;
  /** Zoom da camera ortografica. */
  zoom?: number;
  /** Velocidade relativa do auto-rotate (1=normal). Use ~0.4 para "balanco lento". */
  autoRotateSpeed?: number;
}

export function DadoCanvas({
  rotations = [[0, 0, 0], [0, 0, 0]],
  autoRotate = false,
  count = 2,
  zoom = 100,
  autoRotateSpeed = 1,
}: Props) {
  // Posicionamento dos dados: 1 centrado, 2 espacados lateralmente
  const positions: Array<[number, number, number]> =
    count === 1 ? [[0, 0, 0]] : [[-0.8, 0, 0], [0.8, 0, 0]];

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

        {positions.map((pos, i) =>
          autoRotate ? (
            <DadoAutoRotate
              key={i}
              position={pos}
              speedScale={i === 0 ? autoRotateSpeed : autoRotateSpeed * 1.15}
            />
          ) : (
            <Dado
              key={i}
              rotation={rotations[i] ?? [0, 0, 0]}
              position={pos}
            />
          )
        )}
      </Canvas>
    </div>
  );
}
