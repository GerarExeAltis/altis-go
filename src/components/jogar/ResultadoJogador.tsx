'use client';
import { Trophy, Heart, Share2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  premioNome: string;
  ePremioReal: boolean;
  nome?: string;
}

export function ResultadoJogador({ premioNome, ePremioReal, nome }: Props) {
  if (ePremioReal) {
    const linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(
      `Ganhei "${premioNome}" na Roleta Altis! 🎉`
    )}`;
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/10 to-background p-6 text-center"
        role="status"
      >
        <Trophy className="h-24 w-24 text-primary" />
        <h1 className="text-4xl font-extrabold tracking-tight">
          Parabéns{nome ? `, ${nome}` : ''}!
        </h1>
        <p className="text-xl">Você ganhou:</p>
        <p className="rounded-2xl border-4 border-primary bg-card px-8 py-4 text-3xl font-extrabold text-primary">
          {premioNome}
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          Mostre esta tela ao operador da Altis para retirar o prêmio.
        </p>
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
        >
          <Share2 className="h-4 w-4" />
          Compartilhar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      role="status"
    >
      <Heart className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold tracking-tight">
        Não foi dessa vez{nome ? `, ${nome}` : ''}!
      </h1>
      <p className="text-lg text-muted-foreground">
        Obrigado por participar. Volte para tentar a sorte em outro evento Altis!
      </p>
    </div>
  );
}
