'use client';
import { WifiOff } from 'lucide-react';

export function ErroOverlay({ mensagem }: { mensagem: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 p-8 text-center">
      <WifiOff className="h-16 w-16 text-destructive" />
      <h2 className="text-3xl font-bold">Reconectando...</h2>
      <p className="text-muted-foreground">{mensagem}</p>
    </div>
  );
}
