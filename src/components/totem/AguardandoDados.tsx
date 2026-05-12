'use client';
import { LogoAltis } from '@/components/LogoAltis';
import { Smartphone } from 'lucide-react';

interface Props { nome?: string | null }

export function AguardandoDados({ nome }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background text-center">
      <LogoAltis size={96} />
      <h1 className="text-6xl font-extrabold tracking-tight">
        {nome ? `Boa sorte, ${nome}!` : 'Boa sorte!'}
      </h1>
      <div className="flex items-center gap-3 text-2xl text-muted-foreground">
        <Smartphone className="h-7 w-7 animate-pulse text-primary" />
        <span>Toque em <strong className="text-foreground">GIRAR</strong> no seu celular</span>
      </div>
    </div>
  );
}
