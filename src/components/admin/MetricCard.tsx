'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        {Icone && <Icone className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{valor}</div>
        {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
}
