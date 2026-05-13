'use client';

const COR_OURO = '#f4c430';
const COR_OURO_ESCURO = '#a8740a';
const COR_DETALHE_ESCURO = '#1a1208';

/** Eixo central decorativo: disco dourado em camadas + joia central. */
export function EixoCentro() {
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
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Brilho central (pequeno highlight) */}
      <mesh position={[-0.05, 0.05, 0.32]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color="#ffd6c2" transparent opacity={0.7} />
      </mesh>

      {/* Aro fino preto entre joia e disco para definicao */}
      <mesh position={[0, 0, 0.16]}>
        <ringGeometry args={[0.2, 0.22, 32]} />
        <meshStandardMaterial color={COR_DETALHE_ESCURO} />
      </mesh>
    </group>
  );
}
