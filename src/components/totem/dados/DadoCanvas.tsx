'use client';
import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, ContactShadows, Environment, Trail } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { texturaPipsParaFace, PIPS_PLANO_TAMANHO } from './texturasPipsFace';

export const ROTACOES_FACES: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

// Pips renderizados como UM plano texturizado por face em vez de
// 6 esferas. Tecnica usada por Dice So Nice (Foundry VTT) e
// @3d-dice/dice-box-threejs: o pip e desenhado num canvas 2D
// (gradiente radial + highlight) e aplicado como mapa de cor com
// alphaTest. Vantagens vs geometria:
//   - Zero risco de z-fighting (nao ha duas superficies competindo
//     no mesmo plano — o plano texturizado fica 0.001 a frente da
//     face e e a unica geometria naquele z).
//   - 1 draw call por face em vez de ate 6 esferas.
//   - Pips ja vem com sombreado pintado (radial gradient simula
//     a cavidade) — mais barato e mais consistente que iluminacao
//     dinamica em 6 esferas pequenas.
function FacePips({ valor, normal, rotation }: {
  valor: number;
  normal: [number, number, number];
  rotation: [number, number, number];
}) {
  const textura = React.useMemo(() => texturaPipsParaFace(valor), [valor]);
  if (!textura) return null;

  // 0.501 = ligeiramente a frente da face do cubo (face em 0.5).
  // O plano e a unica geometria naquele z, entao 1 unidade de
  // sobre-offset basta — sem polygonOffset ou alphaTest.
  const offsetFace = 0.501;
  return (
    <mesh
      rotation={rotation}
      position={[normal[0] * offsetFace, normal[1] * offsetFace, normal[2] * offsetFace]}
    >
      <planeGeometry args={[PIPS_PLANO_TAMANHO, PIPS_PLANO_TAMANHO]} />
      <meshStandardMaterial
        map={textura}
        transparent
        alphaTest={0.15}
        roughness={0.32}
        metalness={0.4}
        envMapIntensity={0.55}
      />
    </mesh>
  );
}

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

/**
 * Dado controlado externamente (rotation+position+scale). Envolto em
 * <Trail> da drei quando `trail=true` — produz um rastro luminoso
 * turquesa atras do dado, visualizando a trajetoria. attenuation
 * cubica faz o rastro afinar conforme se distancia do dado.
 */
function Dado({ rotation, position, scale = 1, trail = false }: {
  rotation: [number, number, number];
  position: [number, number, number];
  scale?: number;
  trail?: boolean;
}) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  React.useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.scale.set(scale, scale, scale);
  }, [rotation, position, scale]);

  const conteudo = (
    <group ref={groupRef}>
      <CuboDado />
    </group>
  );

  if (!trail) return conteudo;

  return (
    <Trail
      width={1.6}
      length={5}
      color={new THREE.Color('#4afad4')}
      attenuation={(t) => t * t}
    >
      {conteudo}
    </Trail>
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
    <group ref={groupRef}>
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
  /** Quando true, desenha um Trail luminoso atras de cada dado (durante o lance). */
  trail?: boolean;
}

export function DadoCanvas({
  rotations,
  positions,
  scales,
  autoRotate = false,
  count = 2,
  zoom = 100,
  autoRotateSpeed = 1,
  hover = false,
  trail = false,
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
        camera={{ position: [2.6, 2.4, 2.6], zoom, near: 0.1, far: 100 }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block',
        }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
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

        <Environment preset="city" />

        {/* Sombra logo abaixo da BASE dos dados. Como o cubo tem aresta
            1.0 e a base esta em y=-0.5 quando o centro esta em y=0,
            posicionamos a sombra em y=-0.52 (encostada na base) com
            area ampla (scale 14) cobrindo todas as posicoes de
            dispersao aleatoria. */}
        <ContactShadows
          position={[0, -0.52, 0]}
          opacity={0.5}
          scale={14}
          blur={2.0}
          far={1.5}
          resolution={1024}
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
                  trail={trail}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Postprocessing: SMAA suaviza arestas (substitui MSAA — mais
            barato no nivel de qualidade que queremos) e Bloom leve em
            highlights especulares dos pips e do cubo. luminanceThreshold
            alto (0.85) limita o bloom a reflexos brilhantes — sem
            "estourar" a cena. */}
        <EffectComposer multisampling={0}>
          <SMAA />
          <Bloom
            intensity={0.35}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
