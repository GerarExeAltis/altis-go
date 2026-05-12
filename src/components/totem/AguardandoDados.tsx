'use client';
import { LogoAltis } from '@/components/LogoAltis';

interface Props { nome?: string | null }
export function AguardandoDados({ nome }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background text-center">
      <LogoAltis size={96} />
      <h1 className="text-5xl font-bold tracking-tight">
        {nome ? `Boa sorte, ${nome}!` : 'Boa sorte!'}
      </h1>
      <p className="animate-pulse text-2xl text-muted-foreground">Preparando a roleta...</p>
    </div>
  );
}
