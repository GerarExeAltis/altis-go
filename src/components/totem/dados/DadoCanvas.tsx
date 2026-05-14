'use client';
import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Dado 3D estilo cassino: cubo branco com cantos arredondados via
 * scale leve + pips (bolinhas) pretas nas faces. Cada face mostra o
 * numero de pips correspondente (1 a 6).
 *
 * Convencao das faces (orientacao "natural"):
 *   1 -> +Y (cima)         6 -> -Y (baixo)   |  1+6 = 7
 *   2 -> +Z (frente)       5 -> -Z (tras)    |  2+5 = 7
 *   3 -> +X (direita)      4 -> -X (esquerda)|  3+4 = 7
 *
 * Rotacoes pre-calculadas para fazer cada face ficar VOLTADA pra
 * cima (+Y) ao final da animacao de rolagem.
 */
export const ROTACOES_FACES: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

/**
 * Posicoes dos pips em coordenadas 2D no plano da face (-0.32 a +0.32),
 * referente a um cubo de lado 1.
 */
function pipsPorFace(valor: number): Array<[number, number]> {
  const o = 0.28; // offset do centro ate o pip de canto
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
 * Renderiza os pips de UMA face. Recebe a face index (0..5) que
 * determina rotacao+posicao no cubo, e o valor (1..6) que determina
 * quantos pips e onde.
 *
 * Mapping face index -> orientacao no cubo (BoxGeometry):
 *   0: +Y (cima)        -> valor 1
 *   1: -Y (baixo)       -> valor 6
 *   2: +X (direita)     -> valor 3
 *   3: -X (esquerda)    -> valor 4
 *   4: +Z (frente)      -> valor 2
 *   5: -Z (tras)        -> valor 5
 */
function FacePips({ valor, normal, rotation }: {
  valor: number;
  normal: [number, number, number];
  rotation: [number, number, number];
}) {
  const pips = pipsPorFace(valor);
  // empurra os pips um pouco fora da face do cubo para nao terem z-fighting
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

function Dado({ rotation }: { rotation: [number, number, number] }) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  // Mantem a rotacao atualizada — o pai controla via prop, mas usamos
  // useFrame para suavizar pequenas mudancas se necessario.
  React.useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
  }, [rotation]);

  return (
    <group ref={groupRef}>
      {/* Corpo do cubo, branco fosco */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fafafa" roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Faces com pips. Convencao: 1 cima, 6 baixo, 2 frente, 5 tras, 3 direita, 4 esq. */}
      <FacePips valor={1} normal={[0, 1, 0]}  rotation={[-Math.PI / 2, 0, 0]} />
      <FacePips valor={6} normal={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <FacePips valor={2} normal={[0, 0, 1]}  rotation={[0, 0, 0]} />
      <FacePips valor={5} normal={[0, 0, -1]} rotation={[0, Math.PI, 0]} />
      <FacePips valor={3} normal={[1, 0, 0]}  rotation={[0, Math.PI / 2, 0]} />
      <FacePips valor={4} normal={[-1, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
}

/**
 * Versao auto-rotate para tela inicial: gira lentamente em loop,
 * sem face alvo. Usa useFrame para incrementar rotacao por delta.
 */
function DadoAutoRotate() {
  const groupRef = React.useRef<THREE.Group | null>(null);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += delta * 0.5;
    groupRef.current.rotation.y += delta * 0.7;
  });

  return (
    <group ref={groupRef}>
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
    </group>
  );
}

interface Props {
  /** Rotacao atual do cubo (controlada pelo hook usarAnimacaoDado). Ignorada se autoRotate=true. */
  rotation?: [number, number, number];
  /** Quando true, gira em loop sem destino (tela inicial). */
  autoRotate?: boolean;
  /** Zoom da camera ortografica. Default 110. */
  zoom?: number;
}

export function DadoCanvas({ rotation = [0, 0, 0], autoRotate = false, zoom = 110 }: Props) {
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

        {autoRotate ? <DadoAutoRotate /> : <Dado rotation={rotation} />}
      </Canvas>
    </div>
  );
}
