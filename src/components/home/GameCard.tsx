import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GameCardProps {
  href: string;
  icone: string;
  titulo: string;
  subtitulo: string;
  disabled?: boolean;
  badge?: string;
}

export function GameCard({ href, icone, titulo, subtitulo, disabled, badge }: GameCardProps) {
  const content = (
    <div
      className={cn(
        'group relative flex h-72 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-sm transition-all',
        disabled
          ? 'cursor-not-allowed border-border/60 opacity-50'
          : 'border-border/60 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02]'
      )}
    >
      {/* Glow sutil no hover */}
      {!disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/10 opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}

      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/60">
          {badge}
        </span>
      )}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 text-5xl ring-1 ring-primary/30"
        aria-hidden
      >
        {icone}
      </div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">{titulo}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>
      {!disabled && (
        <span className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow group-hover:shadow-md">
          Abrir Totem
        </span>
      )}
    </div>
  );

  if (disabled) return <div aria-disabled>{content}</div>;
  return <Link href={href} className="block">{content}</Link>;
}
