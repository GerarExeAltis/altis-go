'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// "Metal Altis" — verde-cinza dessaturado, mais sobrio que o primary puro.
const COR_OURO = '#6b8d8a';
const COR_OURO_ESCURO = '#3a4f4d';
const COR_PRIMARY = '#4afad4';
const COR_PRIMARY_ESCURO = '#009993';
const COR_DETALHE_ESCURO = '#0a1d1c';

/**
 * Eixo central decorativo: disco dourado + joia primary (Altis) com
 * brilho rotativo sutil. Sem estrelinhas amarelas (poluiam visualmente
 * com a paleta).
 */
export function EixoCentro() {
  const brilhoRef = React.useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (brilhoRef.current) {
      brilhoRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <group position={[0, 0, 0.15]}>
      {/* Anel externo do eixo (dourado escuro, sombra) */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[0.55, 48]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Disco principal dourado */}
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[0.48, 48]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Anel interno decorativo */}
      <mesh position={[0, 0, 0.1]}>
        <ringGeometry args={[0.28, 0.34, 48]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Brilho rotativo atras da joia (anel com glow) */}
      <mesh ref={brilhoRef} position={[0, 0, 0.14]}>
        <ringGeometry args={[0.22, 0.27, 4, 1]} />
        <meshBasicMaterial color={COR_PRIMARY} transparent opacity={0.55} />
      </mesh>

      {/* Joia central — primary Altis com emissivo */}
      <mesh position={[0, 0, 0.18]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color={COR_PRIMARY}
          metalness={0.45}
          roughness={0.18}
          emissive={COR_PRIMARY_ESCURO}
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* Highlight branco no canto superior esquerdo da joia */}
      <mesh position={[-0.06, 0.06, 0.32]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>

      {/* Aro fino escuro entre joia e disco para definicao */}
      <mesh position={[0, 0, 0.16]}>
        <ringGeometry args={[0.2, 0.22, 32]} />
        <meshStandardMaterial color={COR_DETALHE_ESCURO} />
      </mesh>
    </group>
  );
}
