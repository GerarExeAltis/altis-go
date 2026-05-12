'use client';
import { AlertTriangle } from 'lucide-react';
import { LogoAltis } from '@/components/LogoAltis';

interface Props {
  titulo: string;
  mensagem: string;
}

export function ErroSessao({ titulo, mensagem }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <LogoAltis size={56} />
      <AlertTriangle className="h-16 w-16 text-destructive" />
      <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
      <p className="max-w-md text-base text-muted-foreground">{mensagem}</p>
    </div>
  );
}
