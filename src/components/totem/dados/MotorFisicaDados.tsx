'use client';
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { DadoFisico } from './DadoFisico';

interface Props {
  /** Face que cada dado deve mostrar para cima ao final (1..6). */
  faceAlvo: number;
  /** Incrementar a cada novo lance para disparar a fisica. */
  lancarTrigger: number;
  reduzirMovimento?: boolean;
  /** Disparado quando AMBOS os dados terminaram o snap. */
  onConcluir: () => void;
}

/**
 * Piso invisivel onde os dados quicam. Posicionado em y=-0.5 (mesma
 * altura da ContactShadows) — assim a sombra cai exatamente onde os
 * dados encostam. Cuboid colossal (40x1x40) para garantir cobertura.
 */
function Piso() {
  return (
    <RigidBody type="fixed" friction={0.9} restitution={0.2} colliders={false}>
      <CuboidCollider args={[20, 0.5, 20]} position={[0, -1.0, 0]} />
    </RigidBody>
  );
}

/**
 * 4 paredes invisiveis em volta da camera para conter os dados na
 * area visivel. Camera ortografica zoom ~120 com FOV em [-3, 3] no
 * plano XZ — paredes em ±3 com altura 4 cobrem o viewport.
 */
function Paredes() {
  return (
    <RigidBody type="fixed" friction={0.6} restitution={0.5} colliders={false}>
      <CuboidCollider args={[0.5, 3, 4]} position={[3.5, 1.5, 0]} />
      <CuboidCollider args={[0.5, 3, 4]} position={[-3.5, 1.5, 0]} />
      <CuboidCollider args={[4, 3, 0.5]} position={[0, 1.5, 3.0]} />
      <CuboidCollider args={[4, 3, 0.5]} position={[0, 1.5, -3.0]} />
      {/* Teto pra impedir voos infinitos */}
      <CuboidCollider args={[4, 0.5, 4]} position={[0, 5.5, 0]} />
    </RigidBody>
  );
}

export function MotorFisicaDados({
  faceAlvo,
  lancarTrigger,
  reduzirMovimento = false,
  onConcluir,
}: Props) {
  // Conta quantos dados terminaram. Quando bate 2, dispara onConcluir.
  const prontosRef = React.useRef(0);
  // Reset do contador quando um novo lance dispara
  const ultimoTriggerRef = React.useRef(lancarTrigger);
  React.useEffect(() => {
    if (lancarTrigger !== ultimoTriggerRef.current) {
      ultimoTriggerRef.current = lancarTrigger;
      prontosRef.current = 0;
    }
  }, [lancarTrigger]);

  const onProntoUnico = React.useCallback(() => {
    prontosRef.current++;
    if (prontosRef.current >= 2) {
      onConcluir();
    }
  }, [onConcluir]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        orthographic
        shadows
        camera={{ position: [2.6, 2.4, 2.6], zoom: 120, near: 0.1, far: 100 }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block',
        }}
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }}
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

        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.55}
          scale={14}
          blur={2.0}
          far={2.0}
          resolution={1024}
          color="#0a1d1c"
        />

        {/* Gravidade calibrada um pouco acima de real (-15 vs -9.8)
            para queda mais "snappy" — usuario percebe mais agil que
            a fisica real, mantendo aparencia natural. */}
        <Physics gravity={[0, -15, 0]} timeStep="vary">
          <Piso />
          <Paredes />
          <DadoFisico
            posicaoInicial={[-0.7, 1.2, 0]}
            faceAlvo={faceAlvo}
            lancarTrigger={lancarTrigger}
            reduzido={reduzirMovimento}
            onProntoEsteDado={onProntoUnico}
            idleSpin={[0.5, 0.7]}
          />
          <DadoFisico
            posicaoInicial={[0.7, 1.2, 0]}
            faceAlvo={faceAlvo}
            lancarTrigger={lancarTrigger}
            reduzido={reduzirMovimento}
            onProntoEsteDado={onProntoUnico}
            idleSpin={[0.6, 0.55]}
          />
        </Physics>

        {!reduzirMovimento && (
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom
              intensity={0.35}
              luminanceThreshold={0.85}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
