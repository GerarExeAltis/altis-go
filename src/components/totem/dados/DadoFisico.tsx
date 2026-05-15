'use client';
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CuboDado, ROTACOES_FACES } from './DadoCanvas';

type Estado = 'idle' | 'lancando' | 'pronto';

interface Props {
  /** Posicao em que o dado fica flutuando antes do lance. */
  posicaoInicial: [number, number, number];
  /**
   * Posicao FINAL na qual o dado deve assentar no chao. Calculada
   * pelo MotorFisicaDados para garantir separacao entre os 2 dados.
   * y vira 0 (sobre o piso virtual em y=-0.5 + meio cubo).
   */
  posicaoFinal: [number, number, number];
  /** Face que deve ficar para cima ao final (1..6). */
  faceAlvo: number;
  /** Incrementa cada vez que o lance for disparado. */
  lancarTrigger: number;
  /** prefers-reduced-motion — anima rapido sem giros. */
  reduzido?: boolean;
  /** Chamado quando este dado terminou (estado vira 'pronto'). */
  onProntoEsteDado: () => void;
  /** Velocidade de giro no idle, em rad/s (X, Y). */
  idleSpin?: [number, number];
  /** Numero de revolucoes durante o lance — variar por dado da naturalidade. */
  revolucoes?: [number, number, number];
}

const DUR_LANCE_S = 1.7;
const DUR_LANCE_REDUZIDO_S = 0.45;
const APICE_Y = 1.6;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Dado animado de forma DETERMINISTICA via useFrame — sem fisica.
 *
 * A coreografia e calculada no momento do lance, baseada em:
 *   - posicao inicial e final
 *   - face alvo (faceAlvo)
 *   - numero de revolucoes desejadas (revolucoes)
 *
 * Durante o lance:
 *   - X/Z interpolam de inicio -> final com ease-out cubic
 *   - Y traca arco parabolico passando por APICE_Y no meio
 *   - Rotacao cresce CONTINUAMENTE de quat_inicial ate quat_alvo +
 *     revolucoes completas em cada eixo. Como N voltas inteiras
 *     somam um multiplo de 2*pi (= identidade visual), o angulo
 *     final RENDERIZADO e exatamente o que poe faceAlvo para cima.
 *
 * O ponto-chave para credibilidade: NAO HA SNAP NO FIM. A rotacao
 * em t=1 ja e a rotacao alvo. O dado para na face correta porque
 * a trajetoria foi calculada assim — nao porque foi "corrigido"
 * apos cair.
 */
export function DadoFisico({
  posicaoInicial,
  posicaoFinal,
  faceAlvo,
  lancarTrigger,
  reduzido = false,
  onProntoEsteDado,
  idleSpin = [0.5, 0.7],
  revolucoes = [3, 3.5, 2],
}: Props) {
  const groupRef = React.useRef<THREE.Group | null>(null);
  const estadoRef = React.useRef<Estado>('idle');

  const idleTRef = React.useRef(0);
  const lanceInicioRef = React.useRef(0);

  // Trajetoria calculada no momento do lance
  const startPosRef = React.useRef(new THREE.Vector3());
  const endPosRef = React.useRef(new THREE.Vector3());
  const startEulerRef = React.useRef(new THREE.Euler(0, 0, 0));
  const endEulerComRevolucoesRef = React.useRef(new THREE.Euler(0, 0, 0));

  const ultimoTriggerRef = React.useRef(lancarTrigger);
  const avisouProntoRef = React.useRef(false);

  React.useEffect(() => {
    if (lancarTrigger === ultimoTriggerRef.current) return;
    ultimoTriggerRef.current = lancarTrigger;
    const g = groupRef.current;
    if (!g) return;

    // Captura posicao + rotacao atuais como ponto de partida da
    // trajetoria. Como o dado estava idle, idleT controlava rotacao
    // e bobbing — o estado visivel naquele instante eh o que serve.
    startPosRef.current.copy(g.position);
    startEulerRef.current.copy(g.rotation);

    // Destino: chao na posicao final. y do centro do cubo = 0 (cubo
    // de aresta 1 com base em y=-0.5).
    endPosRef.current.set(posicaoFinal[0], posicaoFinal[1], posicaoFinal[2]);

    // Rotacao alvo = euler que poe faceAlvo para cima + jitter Y
    // pequeno (Y eh o eixo vertical entao girar nele preserva qual
    // face fica em cima — apenas dah naturalidade).
    const [rx, ry, rz] = ROTACOES_FACES[faceAlvo] ?? [0, 0, 0];
    const jitterY = (Math.random() - 0.5) * 0.5;

    // Calcular rotacao "com N revolucoes": pegar o angulo alvo e
    // somar revolucoes*2pi por eixo. Como vamos interpolar
    // LINEARMENTE de startEuler -> endEulerComRevolucoes, ao chegar
    // em t=1 a rotacao sera endEulerComRevolucoes — visualmente
    // equivale (modulo 2pi) ao alvo. Durante a interpolacao, o cubo
    // gira voltas completas + atinge o alvo.
    // Importante: somamos as voltas EM RELACAO ao start, nao no
    // alvo absoluto. Isso garante: angulo_renderizado_em_t1 =
    // start + (alvo - start) + N*2pi = alvo + N*2pi ≡ alvo (mod 2pi).
    const start = startEulerRef.current;
    const targetX = rx + revolucoes[0] * Math.PI * 2 *
      (Math.random() < 0.5 ? -1 : 1) + (rx >= start.x ? 0 : 0);
    const targetY = ry + jitterY + revolucoes[1] * Math.PI * 2 *
      (Math.random() < 0.5 ? -1 : 1);
    const targetZ = rz + revolucoes[2] * Math.PI * 2 *
      (Math.random() < 0.5 ? -1 : 1);

    // Aplicar o "atalho" garante destino exato:
    //   final_renderizado = start + (target - start) = target
    // E target ≡ alvo (mod 2pi). Logo a face fica certa.
    endEulerComRevolucoesRef.current.set(targetX, targetY, targetZ);

    lanceInicioRef.current = performance.now();
    avisouProntoRef.current = false;
    estadoRef.current = 'lancando';
  }, [lancarTrigger, posicaoFinal, faceAlvo, revolucoes]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    if (estadoRef.current === 'idle') {
      if (reduzido) return;
      idleTRef.current += delta;
      const t = idleTRef.current;
      g.rotation.set(t * idleSpin[0], t * idleSpin[1], 0);
      const bob = Math.sin(t * 1.4) * 0.04;
      g.position.set(posicaoInicial[0], posicaoInicial[1] + bob, posicaoInicial[2]);
      return;
    }

    if (estadoRef.current === 'lancando') {
      const dur = (reduzido ? DUR_LANCE_REDUZIDO_S : DUR_LANCE_S) * 1000;
      const elapsed = performance.now() - lanceInicioRef.current;
      const t = Math.min(1, elapsed / dur);
      const tEase = easeOutCubic(t);

      const start = startPosRef.current;
      const end = endPosRef.current;

      // X e Z: interpolacao ease-out cubic. Aceleracao no inicio
      // (subida + lateralizacao rapida), desaceleracao no fim
      // (assenta gentilmente).
      g.position.x = start.x + (end.x - start.x) * tEase;
      g.position.z = start.z + (end.z - start.z) * tEase;

      // Y: arco parabolico. Linear de start -> end no eixo "base"
      // + um arco extra (apice) cujo pico esta em t=0.5.
      const linearY = start.y + (end.y - start.y) * tEase;
      const arco = 4 * t * (1 - t) * APICE_Y;
      g.position.y = linearY + arco;

      // Rotacao: interpolacao LINEAR de start -> end_com_revolucoes.
      // Linear (nao ease) porque queremos giro de velocidade
      // constante durante a queda — looks more natural for a dice.
      // No fim, t=1, rotacao = end_com_revolucoes ≡ alvo (mod 2pi).
      const startE = startEulerRef.current;
      const endE = endEulerComRevolucoesRef.current;
      g.rotation.x = startE.x + (endE.x - startE.x) * t;
      g.rotation.y = startE.y + (endE.y - startE.y) * t;
      g.rotation.z = startE.z + (endE.z - startE.z) * t;

      if (t >= 1) {
        // Garantir posicao + rotacao EXATAS ao terminar — qualquer
        // erro de ponto-flutuante acumulado some aqui.
        g.position.set(end.x, end.y, end.z);
        g.rotation.set(endE.x, endE.y, endE.z);
        estadoRef.current = 'pronto';
        if (!avisouProntoRef.current) {
          avisouProntoRef.current = true;
          onProntoEsteDado();
        }
      }
    }
    // 'pronto': nao mexer mais — dado fica EXATAMENTE onde
    // a animacao terminou. Esta eh a garantia de "sem
    // reposicionamento apos o fim".
  });

  return (
    <group
      ref={groupRef}
      position={posicaoInicial}
    >
      <CuboDado />
    </group>
  );
}
