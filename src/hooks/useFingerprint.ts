'use client';
import * as React from 'react';

function gatherCanvasFingerprint(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('AltisBet:fp,01€~', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AltisBet:fp,01€~', 4, 4);
    return canvas.toDataURL().slice(-200);
  } catch {
    return '';
  }
}

function gatherStaticBits(): string {
  if (typeof window === 'undefined') return '';
  return [
    navigator.userAgent ?? '',
    navigator.language ?? '',
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? '',
    (navigator as { deviceMemory?: number }).deviceMemory ?? '',
  ].join('|');
}

// ── SHA-256 ─────────────────────────────────────────────────────────────
// Tenta crypto.subtle primeiro (rapido, nativo). Cai pra implementacao
// puro-JS quando estamos em contexto inseguro (HTTP via IP da LAN, comum
// para testes do celular acessando o totem na rede local), onde subtle
// nao esta disponivel. A saida e identica entre os dois caminhos —
// fingerprint permanece estavel mesmo trocando de protocolo.
// ────────────────────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return sha256HexPureJs(input);
}

// SHA-256 puro JS (FIPS 180-4). Compacto, sem dependencias.
function sha256HexPureJs(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const len = bytes.length;
  const blocks: Uint8Array = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  blocks.set(bytes);
  blocks[len] = 0x80;
  const bitLen = len * 8;
  // 64-bit big-endian length nos ultimos 8 bytes
  blocks[blocks.length - 4] = (bitLen >>> 24) & 0xff;
  blocks[blocks.length - 3] = (bitLen >>> 16) & 0xff;
  blocks[blocks.length - 2] = (bitLen >>> 8) & 0xff;
  blocks[blocks.length - 1] = bitLen & 0xff;

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const W = new Uint32Array(64);

  for (let i = 0; i < blocks.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      const j = i + t * 4;
      W[t] =
        (blocks[j] << 24) | (blocks[j + 1] << 16) | (blocks[j + 2] << 8) | blocks[j + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3];
    let e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e;
      e = (d + temp1) | 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  return Array.from(H)
    .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

function rotr(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

export function useFingerprint(): {
  fingerprint: string | null;
  loading: boolean;
} {
  const [fingerprint, setFingerprint] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = `${gatherStaticBits()}::${gatherCanvasFingerprint()}`;
        const fp = await sha256Hex(raw);
        if (alive) {
          setFingerprint(fp);
          setLoading(false);
        }
      } catch (err) {
        console.error('useFingerprint:', err);
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { fingerprint, loading };
}
