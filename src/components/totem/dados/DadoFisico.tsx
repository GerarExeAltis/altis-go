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

const DUR_LANCE_S = 2.4;
const DUR_LANCE_REDUZIDO_S = 0.55;
// Altura do arco principal. O dado sobe ate startY + APICE_Y, desce
// ate o chao, e quica 2x decrescente. APICE_Y=2.6 deixa o pico bem
// acima do idle, dando sensacao clara de "arremesso".
const APICE_Y = 2.6;

// Fases da trajetoria (fracoes do tempo total):
const T_ARCO_FIM = 0.62;      // 0..0.62: arco principal -> primeiro impacto
const T_BOUNCE1_FIM = 0.86;   // 0.62..0.86: primeiro quique
// 0.86..1.0: segundo quique pequeno + repouso
const ALT_BOUNCE1 = 0.32;     // altura do 1o bounce relativa ao apice
const ALT_BOUNCE2 = 0.10;     // altura do 2o bounce

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Altura do dado SOBRE O CHAO (y=0 = chao) em funcao do progresso
 * t in [0..1]. Modela 3 fases:
 *   Fase 1: lancamento + arco ate o chao (primeiro impacto)
 *   Fase 2: bounce decrescente (~32% da altura)
 *   Fase 3: bounce minimo (~10%) + assentamento
 *
 * Em cada fase o pico segue 4u(1-u) — uma parabola normalizada que
 * pico=1 no meio. startY na fase 1 eh a altura inicial do dado em
 * relacao ao chao; reduz linearmente para 0 ao impactar.
 *
 * Visualmente o usuario percebe IMPACTO porque o dado:
 *   - desce, atinge o chao
 *   - volta a subir (pulando)
 *   - desce de novo, atinge o chao
 *   - pequeno saltinho final
 *   - repousa
 *
 * Sem isso o dado parava no ar, sem cue de impacto.
 */
function alturaSobrePiso(t: number, startY: number, apex: number): number {
  if (t < T_ARCO_FIM) {
    const u = t / T_ARCO_FIM;
    // base linear startY -> 0  (perde altura ao longo do tempo)
    // arco acima de base com apex de altura
    return startY * (1 - u) + 4 * u * (1 - u) * apex;
  }
  if (t < T_BOUNCE1_FIM) {
    const u = (t - T_ARCO_FIM) / (T_BOUNCE1_FIM - T_ARCO_FIM);
    return 4 * u * (1 - u) * apex * ALT_BOUNCE1;
  }
  if (t < 1) {
    const u = (t - T_BOUNCE1_FIM) / (1 - T_BOUNCE1_FIM);
    return 4 * u * (1 - u) * apex * ALT_BOUNCE2;
  }
  return 0;
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

    // Rotacao alvo = euler EXATO que poe faceAlvo para cima.
    // Anteriormente havia um "jitter Y" pequeno para naturalidade
    // que CAUSAVA BUG: para faces no eixo X (face 5 usa rx=pi/2),
    // o jitter Y eh aplicado APOS a rotacao X — o que rotaciona em
    // torno do eixo Y LOCAL (que apos rx=pi/2 aponta para world +Z,
    // horizontal). Isso inclinava o cubo o suficiente pra mostrar
    // uma face vizinha (e.g. face 3 ao inves de face 5).
    // Sem jitter, a face alvo eh exatamente a que o jogador ve.
    const [rx, ry, rz] = ROTACOES_FACES[faceAlvo] ?? [0, 0, 0];

    // Calcular rotacao final com N revolucoes COMPLETAS adicionadas
    // em cada eixo. Como N*2pi eh identidade visual, no fim
    // (rx + N*2pi) ≡ rx (mod 2pi) — a face correta fica para cima.
    // Sinais aleatorios em revolucoes dao variedade de direcao do
    // giro (alguns dados giram pra um lado, outros pro outro).
    const signX = Math.random() < 0.5 ? -1 : 1;
    const signY = Math.random() < 0.5 ? -1 : 1;
    const signZ = Math.random() < 0.5 ? -1 : 1;
    const targetX = rx + revolucoes[0] * Math.PI * 2 * signX;
    const targetY = ry + revolucoes[1] * Math.PI * 2 * signY;
    const targetZ = rz + revolucoes[2] * Math.PI * 2 * signZ;

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

      // X e Z: ease-out cubic — aceleracao no inicio, desaceleracao
      // no fim (assenta gentilmente na posicao final).
      g.position.x = start.x + (end.x - start.x) * tEase;
      g.position.z = start.z + (end.z - start.z) * tEase;

      // Y: trajetoria em 3 fases. O dado SOBE no inicio (acima do
      // idle), depois DESCE ate o chao (impacto), quica 2x e repousa.
      // Estas multiplas batidas no chao comunicam IMPACTO FISICO
      // claramente — sem isso o dado parava no ar sem cue visual
      // de que tocou em algo solido.
      const startYRelativa = start.y - end.y;
      g.position.y = end.y + alturaSobrePiso(t, startYRelativa, APICE_Y);

      // Rotacao: easeOutCubic — gira rapido no inicio (durante o
      // arco), desacelera nas batidas. Atinge exatamente o alvo em
      // t=1 (o alvo eh ang_alvo + N*2pi voltas inteiras, entao mod
      // 2pi a face correta fica para cima). Sem easing parecia
      // mecanico/teleporte; com easing parece um dado real perdendo
      // momento angular pelo atrito do impacto.
      const startE = startEulerRef.current;
      const endE = endEulerComRevolucoesRef.current;
      g.rotation.x = startE.x + (endE.x - startE.x) * tEase;
      g.rotation.y = startE.y + (endE.y - startE.y) * tEase;
      g.rotation.z = startE.z + (endE.z - startE.z) * tEase;

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
