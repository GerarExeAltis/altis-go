'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/admin/types';
import type { JogoId } from '@/lib/jogos/types';
import { JOGOS, getJogo, jogosComPreview } from '@/lib/jogos/catalog';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  premios: PremioDb[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Jogo inicialmente selecionado (default: primeiro com Preview). */
  jogoInicial?: JogoId;
}

/**
 * Modal de preview do jogo — layout em duas colunas:
 *  - Sidebar a esquerda: catalogo de jogos (lista vertical).
 *  - Area principal a direita: conteudo do jogo selecionado.
 *
 * Usa o Dialog padrao (Portal + bg-background/80 + animate-in fade-in).
 */
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
        className="flex h-[85vh] max-w-6xl flex-col p-0"
      >
        <header className="border-b border-border/60 px-6 py-4 pr-12">
          <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
            <Eye className="h-5 w-5" />
            Preview de Jogo
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Simulacao visual da experiencia do cliente. NAO afeta dados reais.
          </p>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — catalogo de jogos */}
          <aside className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-muted/30">
            <div className="border-b border-border/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Catálogo
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              <ul className="space-y-1">
                {JOGOS.map((j) => {
                  const ativo = j.id === jogoId;
                  const semPreview = j.Preview === null;
                  return (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => !semPreview && setJogoId(j.id)}
                        disabled={semPreview}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                          ativo
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                            : 'text-foreground hover:bg-muted',
                          semPreview && 'cursor-not-allowed opacity-50 hover:bg-transparent'
                        )}
                        title={semPreview ? `${j.nome} — preview nao disponivel` : j.nome}
                      >
                        <span className="text-lg leading-none" aria-hidden>{j.icone}</span>
                        <span className="flex-1 truncate">{j.nome}</span>
                        {semPreview && j.badge && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {j.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Conteudo do jogo */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
            {jogo?.Preview ? (
              <jogo.Preview premios={premios} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <span className="text-6xl" aria-hidden>{jogo?.icone ?? '🎮'}</span>
                <p className="text-lg font-semibold">{jogo?.nome ?? jogoId}</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Preview deste jogo ainda nao foi implementado.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
