'use client';
import { LogoAltis } from '@/components/LogoAltis';
import { MonitorPlay, CheckCircle2 } from 'lucide-react';

export function AguardandoTotem({ nome }: { nome?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-center">
      <LogoAltis size={64} />

      <div className="flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          {nome ? `Tudo certo, ${nome}!` : 'Tudo certo!'}
        </h1>
        <p className="text-base text-muted-foreground">Seus dados foram registrados.</p>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-border/60 bg-card p-5">
        <MonitorPlay className="h-8 w-8 animate-pulse text-primary" />
        <p className="text-lg font-semibold">Olhe para o totem</p>
        <p className="text-sm text-muted-foreground">
          Toque em GIRAR no totem para a roleta rodar. O resultado aparece aqui logo apos.
        </p>
      </div>
    </div>
  );
}
