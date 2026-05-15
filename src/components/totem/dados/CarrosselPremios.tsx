'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/totem/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface Props {
  premios: PremioDb[];
  /** Velocidade em px/segundo (default 60). */
  velocidade?: number;
}

function faceDoPremio(premio: PremioDb): number {
  return Math.min(6, Math.max(1, premio.ordem_roleta + 1));
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

function CardPremio({ premio }: { premio: PremioDb }) {
  const foto = urlPublica(premio.foto_path);
  const face = faceDoPremio(premio);
  const semEstoque = premio.e_premio_real && premio.estoque_atual <= 0;

  return (
    <div
      className={`flex h-full flex-col items-center justify-between rounded-2xl border bg-card p-3 shadow-sm ${
        semEstoque ? 'opacity-50' : ''
      }`}
      style={{ minHeight: 0 }}
    >
      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-muted/40">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={premio.nome}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl">🎁</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-center text-sm font-semibold leading-tight">
        {premio.nome}
      </p>
      <div className="mt-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 ring-1 ring-primary/30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Tire
        </span>
        <span className="text-base font-extrabold text-primary">
          {face}
        </span>
      </div>
    </div>
  );
}

/**
 * Carrossel infinito de premios mostrando 5 cards por vez. Cada card
 * exibe nome, foto e a face do dado necessaria para ganhar.
 *
 * Implementacao:
 *   - Array de premios eh duplicado em sequencia [A,B,A,B] para
 *     formar uma faixa "infinita" sem costura visivel.
 *   - Largura por card = 1/5 do container (CSS calc).
 *   - Animacao CSS translateX de 0 -> -50% da faixa, loop infinito.
 *     Como a segunda metade eh identica a primeira, o reset eh
 *     invisivel ao usuario.
 *   - Velocidade calculada em segundos a partir de px/s para que
 *     o feeling permaneca constante independente da largura.
 *
 * O componente eh responsivo: cards encolhem proporcionalmente
 * conforme o container. Em containers muito estreitos (mobile),
 * pode-se reduzir o numero de cards visiveis ajustando a CSS var
 * --carrossel-visiveis no caller.
 */
export function CarrosselPremios({ premios, velocidade = 60 }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [larguraContainer, setLarguraContainer] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLarguraContainer(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Filtra premios sem estoque opcionalmente — manter eh mais
  // transparente (jogador ve o que ESTAVA disponivel).
  const lista = premios.length > 0 ? premios : [];
  const itens = React.useMemo(() => [...lista, ...lista], [lista]);

  if (lista.length === 0) return null;

  // Largura de cada card = container / 5 (5 visiveis).
  const visiveis = 5;
  const larguraCard = larguraContainer > 0 ? larguraContainer / visiveis : 0;
  // Duracao do loop = distancia total / velocidade.
  // Distancia para fazer scroll de UMA copia (lista.length cards) = lista.length * larguraCard.
  const distanciaUmaCopia = lista.length * larguraCard;
  const duracaoSegundos = larguraCard > 0 ? distanciaUmaCopia / velocidade : 30;

  return (
    <div
      ref={containerRef}
      // min-w-0 eh CRITICO em filhos de grid/flex: o default
      // min-width:auto faria este container expandir ate caber o
      // 'width:max-content' da faixa interna, esticando a pagina
      // toda horizontalmente. min-w-0 + overflow-hidden garante
      // que a faixa eh CLIPADA na largura do container, nao o
      // contrario.
      className="relative w-full min-w-0 overflow-hidden"
      aria-label="Prêmios disponíveis"
    >
      {/* Vinheta lateral leve — bordas do carrossel "desaparecendo"
          para nao cortarem cards no meio de forma abrupta. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
      />

      <div
        className="flex"
        style={{
          width: 'max-content',
          // Animacao via CSS — declarada inline para o duration ser
          // calculado em runtime baseado na velocidade desejada.
          animation: larguraCard > 0
            ? `carrossel-scroll ${duracaoSegundos}s linear infinite`
            : 'none',
          // Custom property usada no @keyframes
          ['--carrossel-scroll-dist' as string]: `${distanciaUmaCopia}px`,
        }}
      >
        {itens.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="p-2"
            style={{
              width: larguraCard > 0 ? `${larguraCard}px` : '20%',
              flexShrink: 0,
            }}
          >
            <CardPremio premio={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
