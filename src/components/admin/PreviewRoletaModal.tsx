'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/admin/types';
import type { PremioDb as PremioTotem } from '@/lib/totem/types';
import { RoletaCanvas } from '@/components/totem/roleta/RoletaCanvas';
import { usarAnimacaoRoleta } from '@/components/totem/roleta/usarAnimacaoRoleta';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  premios: PremioDb[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/** Escolhe um premio aleatorio ponderado pelos pesos (estoque > 0). */
function sortearPreview(premios: PremioDb[]): string | null {
  const elegiveis = premios.filter((p) => p.peso_base > 0 && (p.estoque_atual > 0 || !p.e_premio_real));
  if (elegiveis.length === 0) return null;
  const pesoTotal = elegiveis.reduce((acc, p) => acc + p.peso_base, 0);
  let r = Math.random() * pesoTotal;
  for (const p of elegiveis) {
    r -= p.peso_base;
    if (r <= 0) return p.id;
  }
  return elegiveis[elegiveis.length - 1].id;
}

export function PreviewRoletaModal({ premios, open, onOpenChange }: Props) {
  const { reduzir } = usePreferredMotion();
  const [premioVencedorId, setVencedor] = React.useState<string | null>(null);
  const [girando, setGirando] = React.useState(false);
  const [resultado, setResultado] = React.useState<PremioDb | null>(null);

  // Converte tipo PremioDb (admin) para o tipo esperado pelo Canvas (totem).
  const premiosTotem = React.useMemo<PremioTotem[]>(
    () => premios.map((p) => ({
      id: p.id,
      nome: p.nome,
      cor_hex: p.cor_hex,
      foto_path: p.foto_path,
      ordem_roleta: p.ordem_roleta,
      e_premio_real: p.e_premio_real,
      estoque_atual: p.estoque_atual,
      peso_base: p.peso_base,
    })),
    [premios]
  );

  const onConcluir = React.useCallback(() => {
    setGirando(false);
    const p = premios.find((x) => x.id === premioVencedorId);
    if (p) setResultado(p);
  }, [premios, premioVencedorId]);

  const { rodaRef, iniciar } = usarAnimacaoRoleta({
    premios: premiosTotem,
    premioVencedorId,
    reduzir,
    onConcluir,
  });

  // Quando setamos um novo vencedor e ainda estamos 'girando', dispara animacao.
  React.useEffect(() => {
    if (girando && premioVencedorId) iniciar();
  }, [girando, premioVencedorId, iniciar]);

  const girar = () => {
    if (girando) return;
    const id = sortearPreview(premios);
    if (!id) {
      alert('Nenhum premio elegivel (sem peso/estoque)');
      return;
    }
    setResultado(null);
    setVencedor(id);
    setGirando(true);
  };

  const reset = () => {
    setVencedor(null);
    setResultado(null);
    setGirando(false);
  };

  // Reset ao fechar
  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview da Roleta
          </DialogTitle>
          <DialogDescription>
            Simulacao visual de como a roleta vai parecer no totem. Toque GIRAR para
            testar a animacao (sorteia ponderado, NAO afeta dados reais).
          </DialogDescription>
        </DialogHeader>

        {premios.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum premio cadastrado. Adicione premios para visualizar a roleta.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-background">
              <RoletaCanvas premios={premiosTotem} rodaRef={rodaRef} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={girar}
                disabled={girando}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-bold text-primary-foreground shadow-md transition-all',
                  'hover:scale-105 active:scale-100',
                  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100'
                )}
              >
                <Play className="h-5 w-5 fill-current" />
                {girando ? 'GIRANDO...' : 'GIRAR'}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={girando || (!resultado && !premioVencedorId)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background px-4 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar
              </button>
            </div>

            {resultado && !girando && (
              <div className="flex flex-col items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Resultado da simulacao
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded ring-1 ring-border/60"
                    style={{ backgroundColor: resultado.cor_hex ?? '#cccccc' }}
                    aria-hidden
                  />
                  <span className="text-lg font-bold">{resultado.nome}</span>
                  {!resultado.e_premio_real && <Badge variant="secondary">Slot vazio</Badge>}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
