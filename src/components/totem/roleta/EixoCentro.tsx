'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const COR_OURO = '#f4c430';
const COR_OURO_ESCURO = '#a8740a';
const COR_DETALHE_ESCURO = '#1a1208';

/**
 * Eixo central decorativo: disco dourado em camadas + joia central +
 * 4 estrelinhas douradas girando ao redor (dinamica continua).
 */
export function EixoCentro() {
  const estrelasRef = React.useRef<THREE.Group>(null);
  // Estrelas giram lentamente (ambiente, mesmo com roleta parada).
  useFrame((_, delta) => {
    if (estrelasRef.current) {
      estrelasRef.current.rotation.z += delta * 0.6;
    }
  });

  return (
    <group position={[0, 0, 0.15]}>
      {/* Anel externo do eixo (dourado escuro, sombra) */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[0.55, 48]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Disco principal dourado */}
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[0.48, 48]} />
        <meshStandardMaterial color={COR_OURO} metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 4 estrelinhas/brilhos girando ao redor do eixo */}
      <group ref={estrelasRef} position={[0, 0, 0.08]}>
        {[0, 1, 2, 3].map((i) => {
          const ang = (i * Math.PI) / 2;
          const x = Math.cos(ang) * 0.36;
          const y = Math.sin(ang) * 0.36;
          return (
            <mesh key={`star-${i}`} position={[x, y, 0]}>
              <circleGeometry args={[0.05, 12]} />
              <meshStandardMaterial
                color="#fff8d6"
                emissive="#ffd24a"
                emissiveIntensity={1.2}
              />
            </mesh>
          );
        })}
      </group>

      {/* Anel interno decorativo */}
      <mesh position={[0, 0, 0.1]}>
        <ringGeometry args={[0.28, 0.34, 48]} />
        <meshStandardMaterial color={COR_OURO_ESCURO} metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Joia central (esfera vermelha brilhante) */}
      <mesh position={[0, 0, 0.18]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color="#c0392b"
          metalness={0.6}
          roughness={0.15}
          emissive="#5c1a13"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Brilho central (highlight) */}
      <mesh position={[-0.06, 0.06, 0.32]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#ffd6c2" transparent opacity={0.75} />
      </mesh>

      {/* Aro fino preto entre joia e disco para definicao */}
      <mesh position={[0, 0, 0.16]}>
        <ringGeometry args={[0.2, 0.22, 32]} />
        <meshStandardMaterial color={COR_DETALHE_ESCURO} />
      </mesh>
    </group>
  );
}
