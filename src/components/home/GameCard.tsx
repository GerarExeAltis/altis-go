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
        'group relative flex h-72 flex-col items-center justify-center rounded-2xl border-2 bg-card p-8 text-center shadow-sm transition-all',
        disabled
          ? 'cursor-not-allowed border-muted opacity-50'
          : 'border-primary/30 hover:border-primary hover:shadow-lg hover:scale-[1.02]'
      )}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      )}
      <div className="text-7xl" aria-hidden>{icone}</div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">{titulo}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>
      {!disabled && (
        <span className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Abrir Totem
        </span>
      )}
    </div>
  );

  if (disabled) return <div aria-disabled>{content}</div>;
  return <Link href={href} className="block">{content}</Link>;
}
