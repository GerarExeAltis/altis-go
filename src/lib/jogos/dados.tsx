'use client';
import * as React from 'react';
import type { JogoDef, PreviewJogoProps } from './types';
import type { PremioDb } from '@/lib/admin/types';
import { MotorFisicaDados } from '@/components/totem/dados/MotorFisicaDados';
import { parDoPremio, MAX_PREMIOS_UNICOS } from '@/lib/jogos/dadosMapeamento';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { Button } from '@/components/ui/button';
import { Dices, RotateCcw } from 'lucide-react';

function sortearPreview(premios: PremioDb[]): PremioDb | null {
  const elegiveis = premios.filter((p) => p.peso_base > 0 && (p.estoque_atual > 0 || !p.e_premio_real));
  if (elegiveis.length === 0) return null;
  const pesoTotal = elegiveis.reduce((acc, p) => acc + p.peso_base, 0);
  let r = Math.random() * pesoTotal;
  for (const p of elegiveis) {
    r -= p.peso_base;
    if (r <= 0) return p;
  }
  return elegiveis[elegiveis.length - 1];
}

function PreviewDados({ premios }: PreviewJogoProps) {
  const { reduzir } = usePreferredMotion();
  const [parAlvo, setParAlvo] = React.useState<[number, number]>([1, 1]);
  const [trigger, setTrigger] = React.useState(0);
  const [girando, setGirando] = React.useState(false);
  const [montarCanvas, setMontarCanvas] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setMontarCanvas(true), 120);
    return () => clearTimeout(id);
  }, []);

  const onConcluir = React.useCallback(() => setGirando(false), []);

  const rolar = () => {
    if (girando) return;
    const p = sortearPreview(premios);
    if (!p) {
      alert('Nenhum premio elegivel (sem peso/estoque)');
      return;
    }
    setParAlvo(parDoPremio(p));
    setTrigger((t) => t + 1);
    setGirando(true);
  };

  const reset = () => {
    setParAlvo([1, 1]);
    setGirando(false);
  };

  if (premios.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum premio cadastrado. Adicione premios para visualizar o dado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {premios.length > MAX_PREMIOS_UNICOS && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
          ⚠ Existem {MAX_PREMIOS_UNICOS} combinações únicas de 2 dados. Você tem {premios.length} prêmios —
          os prêmios além do {MAX_PREMIOS_UNICOS}º vão reutilizar combinações visualmente.
          O sorteio do servidor continua correto.
        </p>
      )}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{ width: 480, height: 480, maxWidth: '100%', flexShrink: 0 }}
        >
          {montarCanvas ? (
            <MotorFisicaDados
              parAlvo={parAlvo}
              lancarTrigger={trigger}
              reduzirMovimento={reduzir}
              onConcluir={onConcluir}
            />
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
        <Button size="lg" variant="outline" onClick={reset} disabled={girando} className="gap-2">
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
