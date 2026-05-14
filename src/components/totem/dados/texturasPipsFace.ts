import * as THREE from 'three';

const TAMANHO_CANVAS = 512;
const PLANO_HALF_WORLD = 0.43;
const PIP_OFFSET_WORLD = 0.28;
const PIP_RAIO_WORLD = 0.075;

const PIP_OFFSET_PX = (PIP_OFFSET_WORLD / PLANO_HALF_WORLD) * (TAMANHO_CANVAS / 2);
const PIP_RAIO_PX = (PIP_RAIO_WORLD / PLANO_HALF_WORLD) * (TAMANHO_CANVAS / 2);

function posicoesPip(valor: number): Array<[number, number]> {
  const o = PIP_OFFSET_PX;
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

function desenharPip(ctx: CanvasRenderingContext2D, cx: number, cy: number, raio: number) {
  const grad = ctx.createRadialGradient(
    cx - raio * 0.25, cy - raio * 0.25, raio * 0.1,
    cx, cy, raio,
  );
  grad.addColorStop(0, '#1c2a2e');
  grad.addColorStop(0.55, '#0a1518');
  grad.addColorStop(1, '#040809');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.arc(cx - raio * 0.32, cy - raio * 0.32, raio * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function criarTexturaFace(valor: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TAMANHO_CANVAS;
  canvas.height = TAMANHO_CANVAS;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, TAMANHO_CANVAS, TAMANHO_CANVAS);

  const meio = TAMANHO_CANVAS / 2;
  for (const [x, y] of posicoesPip(valor)) {
    desenharPip(ctx, meio + x, meio + y, PIP_RAIO_PX);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const cache = new Map<number, THREE.CanvasTexture>();

export const PIPS_PLANO_TAMANHO = PLANO_HALF_WORLD * 2;

export function texturaPipsParaFace(valor: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  let t = cache.get(valor);
  if (!t) {
    t = criarTexturaFace(valor);
    cache.set(valor, t);
  }
  return t;
}
