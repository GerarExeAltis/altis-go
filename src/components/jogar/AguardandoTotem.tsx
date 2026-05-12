'use client';
import { Loader2 } from 'lucide-react';
import { LogoAltis } from '@/components/LogoAltis';

export function AguardandoTotem({ nome }: { nome?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <LogoAltis size={64} />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h1 className="text-2xl font-bold tracking-tight">
        {nome ? `Aguarde, ${nome}!` : 'Aguarde!'}
      </h1>
      <p className="text-lg text-muted-foreground">
        A roleta vai girar no totem em instantes.
      </p>
    </div>
  );
}
