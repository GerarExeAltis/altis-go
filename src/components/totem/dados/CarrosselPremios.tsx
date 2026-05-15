'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/totem/types';
import { parDoPremio } from '@/lib/jogos/dadosMapeamento';
import { DieFace } from '@/components/ui/DieFace';

interface Props {
  premios: PremioDb[];
  /** Velocidade em px/segundo (default 60). */
  velocidade?: number;
  /** Quantos cards visiveis simultaneamente (default 5). */
  visiveis?: number;
  /** Altura do card em px (default 110). */
  alturaCard?: number;
}

function CardPremio({ premio, alturaCard }: { premio: PremioDb; alturaCard: number }) {
  const par = parDoPremio(premio);
  const semEstoque = premio.e_premio_real && premio.estoque_atual <= 0;
  const tamanhoFace = Math.max(28, Math.min(46, alturaCard * 0.42));
  const gap = Math.max(4, tamanhoFace * 0.12);

  return (
    <div
      className={`flex h-full flex-col items-center justify-center rounded-xl border bg-card px-3 shadow-sm ${
        semEstoque ? 'opacity-40' : ''
      }`}
      style={{ height: alturaCard }}
      aria-label={`Para ganhar este prêmio, tire ${par[0]} e ${par[1]}`}
    >
      <div className="flex items-center" style={{ gap }}>
        <DieFace valor={par[0]} tamanho={tamanhoFace} />
        <span className="text-xs font-bold text-muted-foreground">+</span>
        <DieFace valor={par[1]} tamanho={tamanhoFace} />
      </div>
    </div>
  );
}

/**
 * Carrossel infinito de combinacoes dos premios.
 *
 * Cada card exibe APENAS os 2 dados que o jogador precisa tirar
 * para ganhar aquele premio — sem nome, sem foto. O visual ja
 * comunica tudo: "se voce tirar 3 + 5, ganha alguma coisa".
 *
 * Posicionamento e tamanho ficam a cargo do consumidor: este
 * componente respeita 100% do container e adapta altura+largura
 * dos cards a `alturaCard` e `visiveis`.
 */
export function CarrosselPremios({
  premios,
  velocidade = 60,
  visiveis = 5,
  alturaCard = 110,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [larguraContainer, setLarguraContainer] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLarguraContainer(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lista = premios.length > 0 ? premios : [];
  const itens = React.useMemo(() => [...lista, ...lista], [lista]);

  if (lista.length === 0) return null;

  const larguraCard = larguraContainer > 0 ? larguraContainer / visiveis : 0;
  const distanciaUmaCopia = lista.length * larguraCard;
  const duracaoSegundos = larguraCard > 0 ? distanciaUmaCopia / velocidade : 30;

  return (
    <div
      ref={containerRef}
      // min-w-0 + overflow-hidden necessarios — sem isso o flex
      // interno com width:max-content vaza pro grid pai e estica
      // a pagina horizontalmente.
      className="relative w-full min-w-0 overflow-hidden"
      aria-label="Combinações de dados para ganhar cada prêmio"
    >
      {/* Vinhetas laterais — bordas do carrossel "desaparecem"
          para nao cortarem cards no meio. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent"
      />

      <div
        className="flex"
        style={{
          width: 'max-content',
          animation: larguraCard > 0
            ? `carrossel-scroll ${duracaoSegundos}s linear infinite`
            : 'none',
          ['--carrossel-scroll-dist' as string]: `${distanciaUmaCopia}px`,
        }}
      >
        {itens.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="p-1.5"
            style={{
              width: larguraCard > 0 ? `${larguraCard}px` : `${100 / visiveis}%`,
              flexShrink: 0,
            }}
          >
            <CardPremio premio={p} alturaCard={alturaCard} />
          </div>
        ))}
      </div>
    </div>
  );
}
