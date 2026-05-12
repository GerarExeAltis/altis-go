'use client';

export function EixoCentro() {
  return (
    <mesh position={[0, 0, 0.15]}>
      <circleGeometry args={[0.5, 32]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}
