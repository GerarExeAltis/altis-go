'use client';
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DadoFisico } from './DadoFisico';

interface Props {
  /** Face que cada dado deve mostrar para cima ao final (1..6). */
  faceAlvo: number;
  /** Incrementar a cada novo lance para disparar a animacao. */
  lancarTrigger: number;
  reduzirMovimento?: boolean;
  /** Disparado quando AMBOS os dados terminam de pousar. */
  onConcluir: () => void;
}

const POS_INICIAL_DADO_A: [number, number, number] = [-0.7, 1.2, 0];
const POS_INICIAL_DADO_B: [number, number, number] = [0.7, 1.2, 0];

/**
 * Calcula posicoes finais aleatorias na area visivel, garantindo que
 * os 2 dados nao se sobreponham (distancia minima 1.6 unidades no
 * plano XZ).
 *
 * Area util — camera ortografica isometrica zoom 120, viewport
 * +-2.5 unidades. Reservamos margem para o cubo (meio = 0.5) caber.
 * x: [-1.8, 1.8], z: [-1.2, 1.2] (z mais estreito por causa do
 * angulo isometrico — dado muito atras some atras de outro).
 */
function sortearPosicoesFinais(): [
  [number, number, number],
  [number, number, number],
] {
  function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  const X_MIN = -1.6;
  const X_MAX = 1.6;
  const Z_MIN = -0.8;
  const Z_MAX = 0.8;
  const MIN_DIST = 1.6;

  const a: [number, number, number] = [rand(X_MIN, X_MAX), 0, rand(Z_MIN, Z_MAX)];
  let b: [number, number, number] = [rand(X_MIN, X_MAX), 0, rand(Z_MIN, Z_MAX)];

  // Repulsao: se muito perto, separar
  for (let i = 0; i < 6; i++) {
    const dx = a[0] - b[0];
    const dz = a[2] - b[2];
    const d = Math.hypot(dx, dz);
    if (d >= MIN_DIST) break;
    const ux = d > 0.001 ? dx / d : 1;
    const uz = d > 0.001 ? dz / d : 0;
    b[0] = a[0] - ux * MIN_DIST;
    b[2] = a[2] - uz * MIN_DIST;
    // Clampar dentro dos limites
    b[0] = Math.max(X_MIN, Math.min(X_MAX, b[0]));
    b[2] = Math.max(Z_MIN, Math.min(Z_MAX, b[2]));
  }

  return [a, b];
}

/**
 * Cena 3D dos 2 dados — animacao puramente DETERMINISTICA via
 * Three.js (useFrame). Sem motor de fisica, sem snap pos-queda.
 *
 * Por que abandonamos a fisica?
 *   Em sistemas como Dice So Nice (Foundry VTT), o desafio do
 *   "resultado predeterminado" eh resolvido com pre-simulacao
 *   (tenta varios impulsos ate cair na face certa). Implementacoes
 *   mais simples — incluindo a primeira versao deste codigo — usam
 *   fisica real + snap pos-assentamento. O snap eh visualmente
 *   identificavel e da sensacao de "manipulacao".
 *
 *   Aqui usamos animacao determinista: a trajetoria eh calculada
 *   no momento do lance para terminar EXATAMENTE na face correta.
 *   Sem ajuste posterior. O usuario ve o dado cair, girar
 *   continuamente, e parar na face. Nao ha "salto" porque nao ha
 *   correcao — o destino sempre foi aquele.
 */
export function MotorFisicaDados({
  faceAlvo,
  lancarTrigger,
  reduzirMovimento = false,
  onConcluir,
}: Props) {
  // Conta quantos dados terminaram. Quando bate 2, dispara onConcluir.
  const prontosRef = React.useRef(0);
  // Posicoes finais sorteadas no momento de cada lance
  const [posicoesFinais, setPosicoesFinais] = React.useState<[
    [number, number, number],
    [number, number, number],
  ]>(() => sortearPosicoesFinais());

  const ultimoTriggerRef = React.useRef(lancarTrigger);
  React.useEffect(() => {
    if (lancarTrigger !== ultimoTriggerRef.current && lancarTrigger > 0) {
      ultimoTriggerRef.current = lancarTrigger;
      prontosRef.current = 0;
      setPosicoesFinais(sortearPosicoesFinais());
    }
  }, [lancarTrigger]);

  const onProntoUnico = React.useCallback(() => {
    prontosRef.current++;
    if (prontosRef.current >= 2) {
      onConcluir();
    }
  }, [onConcluir]);

  // Revolucoes diferentes por dado para naturalidade visual
  const revolucoesA: [number, number, number] = React.useMemo(
    () => [3 + Math.random() * 1, 3.5 + Math.random() * 1.5, 2 + Math.random() * 0.8],
    [lancarTrigger],
  );
  const revolucoesB: [number, number, number] = React.useMemo(
    () => [3.5 + Math.random() * 1, 3 + Math.random() * 1.5, 2.2 + Math.random() * 0.8],
    [lancarTrigger],
  );

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

        <DadoFisico
          posicaoInicial={POS_INICIAL_DADO_A}
          posicaoFinal={posicoesFinais[0]}
          faceAlvo={faceAlvo}
          lancarTrigger={lancarTrigger}
          reduzido={reduzirMovimento}
          onProntoEsteDado={onProntoUnico}
          idleSpin={[0.5, 0.7]}
          revolucoes={revolucoesA}
        />
        <DadoFisico
          posicaoInicial={POS_INICIAL_DADO_B}
          posicaoFinal={posicoesFinais[1]}
          faceAlvo={faceAlvo}
          lancarTrigger={lancarTrigger}
          reduzido={reduzirMovimento}
          onProntoEsteDado={onProntoUnico}
          idleSpin={[0.6, 0.55]}
          revolucoes={revolucoesB}
        />

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
