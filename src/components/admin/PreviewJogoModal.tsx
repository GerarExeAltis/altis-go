'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/admin/types';
import type { JogoId } from '@/lib/jogos/types';
import { JOGOS, getJogo, jogosComPreview } from '@/lib/jogos/catalog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  premios: PremioDb[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Jogo inicialmente selecionado (default: primeiro com Preview). */
  jogoInicial?: JogoId;
}

export function PreviewJogoModal({ premios, open, onOpenChange, jogoInicial }: Props) {
  const previewables = React.useMemo(() => jogosComPreview(), []);
  const [jogoId, setJogoId] = React.useState<JogoId>(
    jogoInicial ?? previewables[0]?.id ?? 'roleta'
  );

  React.useEffect(() => {
    if (open && jogoInicial) setJogoId(jogoInicial);
  }, [open, jogoInicial]);

  const jogo = getJogo(jogoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-h-[92vh] max-w-3xl overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview de Jogo
          </DialogTitle>
          <DialogDescription>
            Simulacao visual da experiencia do cliente. NAO afeta dados reais.
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de jogo — so aparece se houver mais de 1 com preview */}
        {previewables.length > 1 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {JOGOS.map((j) => {
              const ativo = j.id === jogoId;
              const desabilitado = j.Preview === null;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => !desabilitado && setJogoId(j.id)}
                  disabled={desabilitado}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    ativo
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 hover:bg-muted',
                    desabilitado && 'cursor-not-allowed opacity-50'
                  )}
                  title={desabilitado ? `${j.nome} — preview nao disponivel` : j.nome}
                >
                  <span aria-hidden>{j.icone}</span>
                  <span>{j.nome}</span>
                  {desabilitado && j.badge && (
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {j.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Conteudo do preview escolhido */}
        {jogo?.Preview ? (
          <jogo.Preview premios={premios} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Preview de <strong>{jogo?.nome ?? jogoId}</strong> ainda nao implementado.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
