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

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
