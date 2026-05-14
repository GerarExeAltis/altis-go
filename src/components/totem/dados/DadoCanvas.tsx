'use client';
import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Convencao das faces:
 *   1 -> +Y (cima)    6 -> -Y (baixo)
 *   2 -> +Z (frente)  5 -> -Z (tras)
 *   3 -> +X (direita) 4 -> -X (esquerda)
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

/**
 * Pip 3D: pequena esfera escura "embutida" na face, com material
 * lustroso (baixa rugosidade, leve metalness) para parecer cavidade
 * polida no dado de cassino real. Usa half-sphere posicionada
 * ligeiramente fora da face — refletida pela iluminacao.
 */
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
        <mesh key={i} position={[x, y, -0.012]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color="#0a1518"
            roughness={0.25}
            metalness={0.55}
            envMapIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Cubo dado com cantos arredondados (RoundedBox da drei), material
 * marfim levemente reflexivo. Pips em todas as 6 faces.
 */
function CuboDado() {
  return (
    <>
      <RoundedBox args={[1, 1, 1]} radius={0.085} smoothness={6} bevelSegments={6} creaseAngle={0.4}>
        <meshStandardMaterial
          color="#f8f5ef"
          roughness={0.42}
          metalness={0.08}
          envMapIntensity={0.55}
        />
      </RoundedBox>
      <FacePips valor={1} normal={[0, 1, 0]}  rotation={[-Math.PI / 2, 0, 0]} />
      <FacePips valor={6} normal={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <FacePips valor={2} normal={[0, 0, 1]}  rotation={[0, 0, 0]} />
      <FacePips valor={5} normal={[0, 0, -1]} rotation={[0, Math.PI, 0]} />
      <FacePips valor={3} normal={[1, 0, 0]}  rotation={[0, Math.PI / 2, 0]} />
      <FacePips valor={4} normal={[-1, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </>
  );
}

function Dado({ rotation, position, scale = 1 }: {
  rotation: [number, number, number];
  position: [number, number, number];
  scale?: number;
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  React.useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.scale.set(scale, scale, scale);
  }, [rotation, position, scale]);

  return (
    <group ref={groupRef} castShadow>
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
      t.current += delta;
      groupRef.current.position.y = position[1] + Math.sin(t.current * 1.8) * 0.08;
    } else {
      groupRef.current.position.y = position[1];
    }
    groupRef.current.position.x = position[0];
    groupRef.current.position.z = position[2];
  });

  return (
    <group ref={groupRef} castShadow>
      <CuboDado />
    </group>
  );
}

interface Props {
  rotations?: Array<[number, number, number]>;
  positions?: Array<[number, number, number]>;
  scales?: number[];
  autoRotate?: boolean;
  count?: 1 | 2;
  zoom?: number;
  autoRotateSpeed?: number;
  hover?: boolean;
}

/**
 * Renderiza ate 2 dados em cena com:
 *  - RoundedBox geometria (cantos suaves estilo dado de cassino)
 *  - MeshStandardMaterial + Environment "city" para reflexos sutis
 *  - ContactShadows (sombra projetada realista no chao)
 *  - Iluminacao em 3 pontos: key (directional), fill (ambient warm),
 *    rim (point primary turquesa para acento Altis)
 */
export function DadoCanvas({
  rotations,
  positions,
  scales,
  autoRotate = false,
  count = 2,
  zoom = 100,
  autoRotateSpeed = 1,
  hover = false,
}: Props) {
  const basePositions: Array<[number, number, number]> =
    count === 1 ? [[0, 0, 0]] : [[-0.9, 0, 0], [0.9, 0, 0]];

  const rots = rotations ?? basePositions.map(() => [0, 0, 0] as [number, number, number]);
  const offs = positions ?? basePositions.map(() => [0, 0, 0] as [number, number, number]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0 }}>
      <Canvas
        orthographic
        shadows
        camera={{ position: [2.6, 2.4, 2.6], zoom }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block',
        }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        {/* Iluminacao em 3 pontos para volume + acento de marca */}
        <ambientLight intensity={0.35} color="#fff5e6" />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.2}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
        />
        <directionalLight position={[-3, 2, -3]} intensity={0.35} color="#dbe6ff" />
        <pointLight position={[0, 1.2, 2.5]} intensity={0.6} color="#4afad4" distance={6} />

        {/* Reflexos sutis no dado (HDRI generico) */}
        <Environment preset="city" />

        {/* Sombra de contato no "chao" — Y = -0.6 onde os dados pousam */}
        <ContactShadows
          position={[0, -0.6, 0]}
          opacity={0.55}
          scale={6}
          blur={2.4}
          far={2}
          resolution={512}
          color="#0a1d1c"
        />

        {basePositions.map((base, i) => {
          const finalPos: [number, number, number] = [
            base[0] + (offs[i]?.[0] ?? 0),
            base[1] + (offs[i]?.[1] ?? 0),
            base[2] + (offs[i]?.[2] ?? 0),
          ];
          return (
            <React.Fragment key={i}>
              {autoRotate ? (
                <DadoAutoRotate
                  position={finalPos}
                  speedScale={i === 0 ? autoRotateSpeed : autoRotateSpeed * 1.15}
                  hover={hover}
                />
              ) : (
                <Dado
                  rotation={rots[i] ?? [0, 0, 0]}
                  position={finalPos}
                  scale={scales?.[i] ?? 1}
                />
              )}
            </React.Fragment>
          );
        })}
      </Canvas>
    </div>
  );
}
