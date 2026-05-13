'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/admin/types';
import type { JogoId } from '@/lib/jogos/types';
import { JOGOS, getJogo, jogosComPreview } from '@/lib/jogos/catalog';
import { Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  premios: PremioDb[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Jogo inicialmente selecionado (default: primeiro com Preview). */
  jogoInicial?: JogoId;
}

/**
 * Painel de preview renderizado INLINE dentro da area de conteudo do
 * AdminLayout — cobre a area com 'absolute inset-0', respeitando a
 * sidebar e o header globais. Espera estar dentro de um pai com
 * `position: relative` (vide AdminLayout — flex-1 ja tem 'relative').
 */
export function PreviewJogoModal({ premios, open, onOpenChange, jogoInicial }: Props) {
  const previewables = React.useMemo(() => jogosComPreview(), []);
  const [jogoId, setJogoId] = React.useState<JogoId>(
    jogoInicial ?? previewables[0]?.id ?? 'roleta'
  );

  React.useEffect(() => {
    if (open && jogoInicial) setJogoId(jogoInicial);
  }, [open, jogoInicial]);

  // Esc fecha o painel
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const jogo = getJogo(jogoId);
  const mostrarSeletor = JOGOS.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-20 flex flex-col bg-background/95 backdrop-blur-sm animate-in fade-in"
    >
      <header className="flex items-start justify-between border-b border-border/60 bg-background px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
            <Eye className="h-5 w-5" />
            Preview de Jogo
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Simulacao visual da experiencia do cliente. NAO afeta dados reais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar preview"
          className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
        {mostrarSeletor && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {JOGOS.map((j) => {
              const ativo = j.id === jogoId;
              const semPreview = j.Preview === null;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => !semPreview && setJogoId(j.id)}
                  disabled={semPreview}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    ativo
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 hover:bg-muted',
                    semPreview && 'cursor-not-allowed opacity-50'
                  )}
                  title={semPreview ? `${j.nome} — preview nao disponivel` : j.nome}
                >
                  <span aria-hidden>{j.icone}</span>
                  <span>{j.nome}</span>
                  {semPreview && j.badge && (
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {j.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

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
  );
}
