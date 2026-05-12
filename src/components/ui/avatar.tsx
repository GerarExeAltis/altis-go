'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  /** Texto fonte para gerar iniciais (ex: e-mail ou nome completo) */
  nome?: string | null;
  /** URL de imagem opcional; se ausente, mostra iniciais. */
  src?: string | null;
  /** Diametro em px. Default 36. */
  size?: number;
  className?: string;
}

function calcularIniciais(fonte: string): string {
  // Se for email, pega antes do @
  const base = fonte.includes('@') ? fonte.split('@')[0] : fonte;
  // Split por espaco/ponto/hifen e pega 1ª letra de cada (ate 2)
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Avatar({ nome, src, size = 36, className }: AvatarProps) {
  const iniciais = nome ? calcularIniciais(nome) : '?';

  return (
    <span
      role="img"
      aria-label={nome ?? 'Usuario'}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.4) }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        'bg-primary/15 font-semibold text-primary ring-1 ring-primary/30',
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={nome ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span>{iniciais}</span>
      )}
    </span>
  );
}
