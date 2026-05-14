'use client';
import * as React from 'react';
import type { JogoDef, PreviewJogoProps } from './types';
import type { PremioDb } from '@/lib/admin/types';
import type { PremioDb as PremioTotem } from '@/lib/totem/types';
import { DadoCanvas } from '@/components/totem/dados/DadoCanvas';
import { usarAnimacaoDado } from '@/components/totem/dados/usarAnimacaoDado';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { Button } from '@/components/ui/button';
import { Dices, RotateCcw } from 'lucide-react';

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

function PreviewDados({ premios }: PreviewJogoProps) {
  const { reduzir } = usePreferredMotion();
  const [premioVencedorId, setVencedor] = React.useState<string | null>(null);
  const [girando, setGirando] = React.useState(false);
  const [montarCanvas, setMontarCanvas] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setMontarCanvas(true), 120);
    return () => clearTimeout(id);
  }, []);

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

  const onConcluir = React.useCallback(() => setGirando(false), []);

  const { rotations, positions, scales, iniciar } = usarAnimacaoDado({
    premios: premiosTotem,
    premioVencedorId,
    reduzir,
    onConcluir,
  });

  React.useEffect(() => {
    if (girando && premioVencedorId) iniciar();
  }, [girando, premioVencedorId, iniciar]);

  const rolar = () => {
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
        Nenhum premio cadastrado. Adicione premios para visualizar o dado.
      </p>
    );
  }

  if (premios.length > 6) {
    // Aviso UX: o dado so tem 6 faces, premios alem do indice 5 vao
    // reusar faces. O sorteio do backend continua correto, mas o
    // visual do dado nao bate com a posicao do premio na lista.
  }

  return (
    <div className="space-y-4">
      {premios.length > 6 && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
          ⚠ Dados tem 6 faces. Você tem {premios.length} prêmios — os
          prêmios além do 6º vão reutilizar faces visualmente. O sorteio
          continua correto.
        </p>
      )}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{ width: 480, height: 480, maxWidth: '100%', flexShrink: 0 }}
        >
          {montarCanvas ? (
            <DadoCanvas rotations={rotations} positions={positions} scales={scales} count={2} zoom={100} />
          ) : (
            <span className="text-sm text-muted-foreground">Carregando dado...</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={rolar} disabled={girando} className="gap-2">
          <Dices className="h-4 w-4" />
          {girando ? 'Rolando...' : 'Rolar'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={reset}
          disabled={girando || !premioVencedorId}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Resetar
        </Button>
      </div>
    </div>
  );
}

export const DADOS_DEF: JogoDef = {
  id: 'dados',
  nome: 'DADOS DA SORTE',
  subtitulo: 'Rolagem 3D com sorteio ponderado',
  icone: '🎲',
  hrefTotem: '/totem-dados',
  status: 'ativo',
  Preview: PreviewDados,
};
