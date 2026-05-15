'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/totem/types';
import { parDoPremio } from '@/lib/jogos/dadosMapeamento';
import { DieFace } from '@/components/ui/DieFace';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface Props {
  premios: PremioDb[];
  /** Velocidade em px/segundo (default 60). */
  velocidade?: number;
  /** Quantos cards visiveis simultaneamente (default 5). */
  visiveis?: number;
  /** Altura do card em px (default 140). */
  alturaCard?: number;
}

function urlPublica(path: string | null): string | null {
  if (!path) return null;
  try {
    const sb = getSupabaseBrowserClient();
    const { data } = sb.storage.from('premios').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

function CardPremio({ premio, alturaCard }: { premio: PremioDb; alturaCard: number }) {
  const par = parDoPremio(premio);
  const foto = urlPublica(premio.foto_path);
  const semEstoque = premio.e_premio_real && premio.estoque_atual <= 0;
  // Dimensoes proporcionais a alturaCard para escalar bem com o
  // tamanho do container.
  const tamanhoFace = Math.max(22, Math.min(34, alturaCard * 0.22));
  const tamanhoFoto = Math.max(36, Math.min(56, alturaCard * 0.38));

  return (
    <div
      className={`flex h-full flex-col items-center justify-between rounded-xl border bg-card px-2 py-2 shadow-sm ${
        semEstoque ? 'opacity-40' : ''
      }`}
      style={{ height: alturaCard }}
      aria-label={`Prêmio ${premio.nome} — para ganhar tire ${par[0]} e ${par[1]}`}
    >
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-md bg-muted/30"
        style={{ height: tamanhoFoto, width: tamanhoFoto }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl">🎁</span>
        )}
      </div>

      <p className="line-clamp-1 w-full text-center text-[11px] font-semibold leading-tight">
        {premio.nome}
      </p>

      <div className="flex items-center gap-1">
        <DieFace valor={par[0]} tamanho={tamanhoFace} />
        <span className="text-[10px] font-bold text-muted-foreground">+</span>
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
  alturaCard = 140,
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
