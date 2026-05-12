'use client';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface Props {
  titulo: string;
  valor: number | string;
  subtitulo?: string;
  icone?: LucideIcon;
}

export function MetricCard({ titulo, valor, subtitulo, icone: Icone }: Props) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{valor}</p>
          {subtitulo && <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {Icone && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
            <Icone className="h-5 w-5" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
