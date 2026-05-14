'use client';
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { CuboDado, ROTACOES_FACES } from './DadoCanvas';

type Estado = 'idle' | 'lancado' | 'snap' | 'pronto';

interface Props {
  posicaoInicial: [number, number, number];
  /** Face que deve ficar para cima ao final (1..6). */
  faceAlvo: number;
  /**
   * Incrementa cada vez que o lance for disparado. Usar contador em
   * vez de boolean para que dois lances seguidos com o mesmo valor
   * disparem dois efeitos (re-disparo apos AUTO_RETORNO p.ex.).
   */
  lancarTrigger: number;
  /** prefers-reduced-motion — desativa idle spin + acelera snap. */
  reduzido?: boolean;
  /** Chamado quando este dado terminou de assentar + snap. */
  onProntoEsteDado: () => void;
  /** Velocidade de giro idle em rad/s (X, Y). */
  idleSpin?: [number, number];
}

const SNAP_DUR_MS = 320;
const SETTLE_FRAMES = 8;
const SETTLE_LSPEED = 0.18;
const SETTLE_ASPEED = 0.22;

/**
 * Um dado com fisica Rapier que tem 4 fases:
 *
 *   idle    — kinematic, girando devagar no ar (chamariz pre-lance).
 *   lancado — dynamic, com impulso + torque aleatorios. Quica no
 *             chao e paredes invisiveis do MotorFisicaDados.
 *   snap    — apos detectar baixa velocidade por SETTLE_FRAMES, vira
 *             kinematic de novo e faz slerp da rotacao para a face
 *             alvo em SNAP_DUR_MS (easing power3.out). Posicao
 *             preservada.
 *   pronto  — quieto, mostrando faceAlvo para cima.
 *
 * Fontes da tecnica:
 *  - Dice So Nice! (Foundry VTT) — snap-to-result apos fisica.
 *  - @3d-dice/dice-box — settle detection via threshold de velocidade
 *    angular+linear durante N frames.
 */
export function DadoFisico({
  posicaoInicial,
  faceAlvo,
  lancarTrigger,
  reduzido = false,
  onProntoEsteDado,
  idleSpin = [0.5, 0.7],
}: Props) {
  const rbRef = React.useRef<RapierRigidBody | null>(null);
  const estadoRef = React.useRef<Estado>('idle');

  // Idle: timer de rotacao continua
  const idleTRef = React.useRef(0);

  // Settle detection: contador de frames quase parados
  const framesParadosRef = React.useRef(0);

  // Snap: quaternion inicial + alvo + timestamp de inicio
  const quatInicialRef = React.useRef(new THREE.Quaternion());
  const quatAlvoRef = React.useRef(new THREE.Quaternion());
  const snapInicioRef = React.useRef(0);

  // Trigger do lance (compara com ultimo valor para detectar bumps)
  const ultimoTriggerRef = React.useRef(lancarTrigger);

  // Avisa o pai uma unica vez por lance
  const avisouProntoRef = React.useRef(false);

  React.useEffect(() => {
    if (lancarTrigger === ultimoTriggerRef.current) return;
    ultimoTriggerRef.current = lancarTrigger;
    const rb = rbRef.current;
    if (!rb) return;

    // Vira dynamic e aplica impulso. setBodyType com numero direto
    // (0 = Dynamic em Rapier) para evitar dependencia do enum.
    rb.setBodyType(0, true);
    rb.setGravityScale(1, true);

    // Reposiciona ligeiramente acima da posicao inicial pra dar arco
    rb.setTranslation(
      { x: posicaoInicial[0], y: posicaoInicial[1] + 1.0, z: posicaoInicial[2] },
      true,
    );
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // Impulso: pra cima + lateral aleatorio. Massa = ~0.5 implica
    // impulso ~3-6 produz velocidade visivelmente "lancada".
    const ix = (Math.random() - 0.5) * 5;
    const iy = 3.5 + Math.random() * 1.8;
    const iz = (Math.random() - 0.5) * 4;
    rb.applyImpulse({ x: ix, y: iy, z: iz }, true);

    const tx = (Math.random() - 0.5) * 4;
    const ty = (Math.random() - 0.5) * 4;
    const tz = (Math.random() - 0.5) * 4;
    rb.applyTorqueImpulse({ x: tx, y: ty, z: tz }, true);

    framesParadosRef.current = 0;
    avisouProntoRef.current = false;
    estadoRef.current = 'lancado';
  }, [lancarTrigger, posicaoInicial]);

  useFrame((_, delta) => {
    const rb = rbRef.current;
    if (!rb) return;

    if (estadoRef.current === 'idle') {
      if (reduzido) return;
      idleTRef.current += delta;
      const t = idleTRef.current;
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(t * idleSpin[0], t * idleSpin[1], 0),
      );
      rb.setNextKinematicRotation(q);
      // Bobbing vertical leve
      const bob = Math.sin(t * 1.4) * 0.04;
      rb.setNextKinematicTranslation({
        x: posicaoInicial[0],
        y: posicaoInicial[1] + bob,
        z: posicaoInicial[2],
      });
      return;
    }

    if (estadoRef.current === 'lancado') {
      const lv = rb.linvel();
      const av = rb.angvel();
      const lspeed = Math.hypot(lv.x, lv.y, lv.z);
      const aspeed = Math.hypot(av.x, av.y, av.z);

      if (lspeed < SETTLE_LSPEED && aspeed < SETTLE_ASPEED) {
        framesParadosRef.current++;
        if (framesParadosRef.current >= SETTLE_FRAMES) {
          // Vai para snap. Captura rotacao atual e calcula alvo.
          const r = rb.rotation();
          quatInicialRef.current.set(r.x, r.y, r.z, r.w);

          const [rx, ry, rz] = ROTACOES_FACES[faceAlvo] ?? [0, 0, 0];
          // Adiciona pequeno random Y para naturalidade — gira em
          // torno do eixo up, entao nao afeta qual face fica em cima
          const randomY = (Math.random() - 0.5) * 0.7;
          quatAlvoRef.current.setFromEuler(new THREE.Euler(rx, ry + randomY, rz));

          // Vira kinematic pra controlar rotacao via slerp.
          // 2 = KinematicPositionBased em Rapier.
          rb.setBodyType(2, true);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rb.setAngvel({ x: 0, y: 0, z: 0 }, true);

          snapInicioRef.current = performance.now();
          estadoRef.current = 'snap';
        }
      } else {
        framesParadosRef.current = 0;
      }
      return;
    }

    if (estadoRef.current === 'snap') {
      const dur = reduzido ? 120 : SNAP_DUR_MS;
      const elapsed = (performance.now() - snapInicioRef.current) / dur;
      const t = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - t, 3); // power3.out

      const q = new THREE.Quaternion().slerpQuaternions(
        quatInicialRef.current,
        quatAlvoRef.current,
        ease,
      );
      rb.setNextKinematicRotation(q);

      if (t >= 1) {
        estadoRef.current = 'pronto';
        if (!avisouProntoRef.current) {
          avisouProntoRef.current = true;
          onProntoEsteDado();
        }
      }
    }
  });

  return (
    <RigidBody
      ref={rbRef}
      type="kinematicPosition"
      position={posicaoInicial}
      colliders="cuboid"
      restitution={0.35}
      friction={0.85}
      mass={0.5}
      linearDamping={0.18}
      angularDamping={0.22}
      ccd
    >
      <CuboDado />
    </RigidBody>
  );
}
