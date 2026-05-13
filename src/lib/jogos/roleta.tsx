'use client';
import * as React from 'react';
import type { JogoDef, PreviewJogoProps } from './types';
import type { PremioDb } from '@/lib/admin/types';
import type { PremioDb as PremioTotem } from '@/lib/totem/types';
import { RoletaCanvas } from '@/components/totem/roleta/RoletaCanvas';
import { usarAnimacaoRoleta } from '@/components/totem/roleta/usarAnimacaoRoleta';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function PreviewRoleta({ premios }: PreviewJogoProps) {
  const { reduzir } = usePreferredMotion();
  const [premioVencedorId, setVencedor] = React.useState<string | null>(null);
  const [girando, setGirando] = React.useState(false);

  const premiosTotem = React.useMemo<PremioTotem[]>(
    () => premios.map((p) => ({
      id: p.id,
      nome: p.nome,
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
  }, []);

  const { rodaRef, iniciar } = usarAnimacaoRoleta({
    premios: premiosTotem,
    premioVencedorId,
    reduzir,
    onConcluir,
  });

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
    setVencedor(id);
    setGirando(true);
  };

  const reset = () => {
    setVencedor(null);
    setGirando(false);
  };

  if (premios.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum premio cadastrado. Adicione premios para visualizar a roleta.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div
          className="overflow-hidden rounded-lg border border-border/60 bg-background"
          style={{ width: 380, height: 380, flexShrink: 0 }}
        >
          <RoletaCanvas premios={premiosTotem} rodaRef={rodaRef} />
        </div>
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
          disabled={girando || !premioVencedorId}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background px-4 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Resetar
        </button>
      </div>
    </div>
  );
}

export const ROLETA_DEF: JogoDef = {
  id: 'roleta',
  nome: 'ROLETA DE PRÊMIOS',
  subtitulo: 'Sorteio ponderado em tempo real',
  icone: '🎰',
  hrefTotem: '/totem',
  status: 'ativo',
  Preview: PreviewRoleta,
};
