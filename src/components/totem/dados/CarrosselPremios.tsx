'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/totem/types';
import { parDoPremio } from '@/lib/jogos/dadosMapeamento';
import { DieFace } from '@/components/ui/DieFace';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface Props {
  premios: PremioDb[];
  /** Velocidade em px/segundo do scroll automatico (default 60). */
  velocidade?: number;
  /** Quantos cards visiveis simultaneamente (default 5). */
  visiveis?: number;
  /** Altura do card em px (default 100 — compacto). */
  alturaCard?: number;
  /**
   * Quando setado, o carrossel PARA o scroll automatico, centraliza
   * o card deste premio no viewport, aplica brilho pulsante nele e
   * apaga (dim) os demais. Use logo apos os dados pousarem para
   * "casar" o resultado fisico ao premio correspondente.
   */
  vencedorId?: string | null;
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

function CardPremio({
  premio,
  alturaCard,
  destacado,
  apagado,
}: {
  premio: PremioDb;
  alturaCard: number;
  destacado: boolean;
  apagado: boolean;
}) {
  const par = parDoPremio(premio);
  const foto = urlPublica(premio.foto_path);
  const semEstoque = premio.e_premio_real && premio.estoque_atual <= 0;
  const tamanhoFace = Math.max(20, Math.min(28, alturaCard * 0.22));
  const tamanhoFoto = Math.max(28, Math.min(40, alturaCard * 0.30));

  // Estados visuais — cuidamos das transicoes via transition-all.
  // Ordem importa: destacado > apagado > semEstoque > normal.
  const classeBase = `relative flex h-full flex-col items-center justify-between
    rounded-xl border px-2 py-2 transition-all duration-500 ease-out`;

  let classeEstado = '';
  if (destacado) {
    // Glow pulsante em primary + scale up + bg gradient quente
    classeEstado = `border-primary bg-gradient-to-b from-primary/15 to-primary/5
      animate-[carrossel-destacar_1.6s_ease-in-out_infinite] z-20`;
  } else if (apagado) {
    classeEstado = `border-border bg-card opacity-25 saturate-50 scale-[0.92]`;
  } else if (semEstoque) {
    classeEstado = `border-border bg-card opacity-40`;
  } else {
    // Normal: leve gradient + ring sutil em primary para "game feel"
    classeEstado = `border-primary/15 bg-gradient-to-b from-card to-secondary/30
      shadow-sm hover:shadow-md`;
  }

  return (
    <div
      className={`${classeBase} ${classeEstado}`}
      style={{ height: alturaCard }}
      aria-label={`Prêmio ${premio.nome} — para ganhar tire ${par[0]} e ${par[1]}`}
    >
      <div
        className="flex items-center justify-center overflow-hidden rounded-md bg-muted/30"
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
          <span className="text-xl">🎁</span>
        )}
      </div>

      <p className={`line-clamp-1 w-full text-center text-[10px] font-bold leading-tight ${
        destacado ? 'text-primary' : 'text-foreground/90'
      }`}>
        {premio.nome}
      </p>

      <div className="flex items-center gap-1">
        <DieFace valor={par[0]} tamanho={tamanhoFace} />
        <span className="text-[9px] font-bold text-muted-foreground">+</span>
        <DieFace valor={par[1]} tamanho={tamanhoFace} />
      </div>
    </div>
  );
}

/**
 * Carrossel "game-styled" — painel com gradient e ring primary,
 * cards menores e mais polidos. Tem dois modos:
 *
 *   modo 'rolando' (vencedorId=null): scroll infinito horizontal
 *     com array duplicado e CSS keyframe.
 *
 *   modo 'destacado' (vencedorId setado): scroll para; carrossel
 *     transita suavemente para CENTRALIZAR o card do vencedor;
 *     card do vencedor pulsa com glow primary; demais cards ficam
 *     dim (opacity 0.25 + dessaturados + scale menor).
 *
 * Esta dupla-modalidade integra o resultado fisico do dado ao
 * carrossel: quando os dados terminam de cair, o jogador ve seu
 * premio sendo "achado" no carrossel, eliminando o desconforto
 * de saber qual premio ganhou.
 */
export function CarrosselPremios({
  premios,
  velocidade = 60,
  visiveis = 5,
  alturaCard = 100,
  vencedorId = null,
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

  // Identificar premio vencedor e calcular offset para centralizar
  const idxVencedor = vencedorId ? lista.findIndex((p) => p.id === vencedorId) : -1;
  const destacando = idxVencedor >= 0;
  let translateXDestaque = 0;
  if (destacando && larguraCard > 0) {
    const centroContainer = larguraContainer / 2;
    const centroCard = larguraCard * (idxVencedor + 0.5);
    translateXDestaque = centroContainer - centroCard;
  }

  // Estilo da faixa interna — alterna entre animacao infinita e
  // transform explicito com transition.
  const estiloFaixa: React.CSSProperties = {
    width: 'max-content',
    ['--carrossel-scroll-dist' as string]: `${distanciaUmaCopia}px`,
  };
  if (destacando) {
    estiloFaixa.transform = `translateX(${translateXDestaque}px)`;
    estiloFaixa.transition = 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)';
    estiloFaixa.animation = 'none';
  } else if (larguraCard > 0) {
    estiloFaixa.animation = `carrossel-scroll ${duracaoSegundos}s linear infinite`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <div
        ref={containerRef}
        // Painel do carrossel: gradient + ring primary discreto +
        // sombra interna sutil — comunica "elemento de jogo" sem
        // ser exagerado. min-w-0 + overflow-hidden previnem o vaza-
        // mento horizontal causado por width:max-content da faixa.
        className="relative w-full min-w-0 overflow-hidden rounded-2xl
          bg-gradient-to-b from-secondary/50 to-secondary/10
          p-2 ring-1 ring-primary/20 shadow-inner"
        aria-label="Combinações de dados para ganhar cada prêmio"
      >
        {/* Vinhetas laterais — efeito de "scroll" infinito sem
            cortar abruptamente cards no meio. Em modo destacando,
            ainda ajudam a focar atencao no centro. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-2 z-10 w-8 rounded-l-xl
            bg-gradient-to-r from-secondary/80 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-2 right-2 z-10 w-8 rounded-r-xl
            bg-gradient-to-l from-secondary/80 to-transparent"
        />

        <div className="flex" style={estiloFaixa}>
          {itens.map((p, i) => {
            const original = i < lista.length;
            // Destacar SO o card da primeira copia (evita pulsar 2
            // cards iguais). Os demais ficam dim quando estamos
            // destacando.
            const estahDestacado = destacando && original && idxVencedor === i;
            const estahApagado = destacando && !estahDestacado;
            return (
              <div
                key={`${p.id}-${i}`}
                className="px-1.5 py-1"
                style={{
                  width: larguraCard > 0 ? `${larguraCard}px` : `${100 / visiveis}%`,
                  flexShrink: 0,
                }}
              >
                <CardPremio
                  premio={p}
                  alturaCard={alturaCard}
                  destacado={estahDestacado}
                  apagado={estahApagado}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
