'use client';
import * as React from 'react';
import type { PremioDb } from '@/lib/totem/types';
import { parDoPremio } from '@/lib/jogos/dadosMapeamento';
import { DieFace } from '@/components/ui/DieFace';
import { urlFotoPremio } from '@/lib/storage/fotoPremio';
import { Trophy } from 'lucide-react';

interface Props {
  premios: PremioDb[];
  /** Velocidade do scroll automatico em px/segundo (default 50). */
  velocidade?: number;
  /** Quantos cards visiveis simultaneamente (default 5). */
  visiveis?: number;
  /**
   * Quando setado, o carrossel PARA o scroll, centraliza o card
   * deste premio e aplica brilho pulsante nele.
   */
  vencedorId?: string | null;
}

function CardPremio({
  premio,
  altura,
  destacado,
  apagado,
}: {
  premio: PremioDb;
  altura: number;
  destacado: boolean;
  apagado: boolean;
}) {
  const par = parDoPremio(premio);
  // Usa o helper canonico (bucket correto: `fotos_premios`).
  // Antes este componente tinha url-helper local apontando para
  // bucket inexistente `premios`, retornando 404 e caindo no
  // fallback Trophy mesmo quando a foto existia.
  const fotoUrl = urlFotoPremio(premio.foto_path);
  const [fotoErrou, setFotoErrou] = React.useState(false);
  // Resetar erro caso a foto_path mude (proximo round, premio
  // diferente). Sem isto, um erro de carga "gruda" no premio.
  React.useEffect(() => {
    setFotoErrou(false);
  }, [premio.foto_path]);
  const mostrarFoto = fotoUrl && !fotoErrou;

  // Estilo "banner de premio" — borda dourada sutil no idle,
  // primary forte quando vencedor. Sem sombras pesadas; usar ring
  // como o sistema de design.
  const classeBase = `relative flex h-full w-full flex-col items-center
    justify-between overflow-hidden rounded-xl border-2 px-3 py-2.5
    transition-all duration-500 ease-out`;

  let classeEstado: string;
  if (destacado) {
    classeEstado = `border-primary bg-gradient-to-br from-primary/15
      via-card to-primary/5 z-20
      animate-[carrossel-destacar_1.6s_ease-in-out_infinite]`;
  } else if (apagado) {
    classeEstado = `border-border bg-card opacity-25 saturate-50 scale-[0.96]`;
  } else {
    // Estado normal — "banner premio": borda dourada sutil + bg
    // gradient suave, sem shadow. Acento gold (#f4c430) eh a
    // assinatura visual do sistema para "premio".
    classeEstado = `border-[#f4c430]/30 bg-gradient-to-br
      from-card via-card to-secondary/30`;
  }

  return (
    <div
      className={`${classeBase} ${classeEstado}`}
      style={{ height: altura }}
      aria-label={`Prêmio ${premio.nome} — tire ${par[0]} e ${par[1]}`}
    >
      {/* Faixa "PREMIO" no topo — comunica imediatamente o que cada
          card representa. Cor gold pra reforcar identidade. */}
      <div className="flex w-full items-center justify-center gap-1">
        <Trophy
          className={`h-3 w-3 ${destacado ? 'text-primary' : 'text-[#f4c430]'}`}
          strokeWidth={2.5}
        />
        <span className={`text-[9px] font-extrabold uppercase tracking-[0.15em] ${
          destacado ? 'text-primary' : 'text-[#f4c430]'
        }`}>
          Prêmio
        </span>
      </div>

      {/* Foto / fallback. Container com gradient sutil para
          comunicar "premio aqui" mesmo sem foto. */}
      <div
        className="flex aspect-square w-full max-w-[64px] items-center
          justify-center overflow-hidden rounded-lg
          bg-gradient-to-br from-secondary/40 to-secondary/10
          ring-1 ring-border/50"
      >
        {mostrarFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl!}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => setFotoErrou(true)}
          />
        ) : (
          // Fallback polido: trofeu gold ao inves de emoji caixa.
          // Mantem a identidade visual de "premio".
          <Trophy
            className={`h-7 w-7 ${destacado ? 'text-primary' : 'text-[#f4c430]/80'}`}
            strokeWidth={1.8}
          />
        )}
      </div>

      {/* Nome do premio — 2 linhas max, tight leading. */}
      <p className={`line-clamp-2 w-full text-center text-[11px] font-bold leading-tight ${
        destacado ? 'text-primary' : 'text-foreground/90'
      }`}>
        {premio.nome}
      </p>

      {/* Combinacao de dados que ganha — visual destacado pra ficar
          claro qual eh o objetivo. */}
      <div className="flex items-center gap-1 rounded-md bg-secondary/40 px-2 py-1">
        <DieFace valor={par[0]} tamanho={20} />
        <span className="text-[9px] font-bold text-muted-foreground">+</span>
        <DieFace valor={par[1]} tamanho={20} />
      </div>
    </div>
  );
}

/**
 * Carrossel vertical de prêmios — sidebar na esquerda da tela do
 * totem de dados. Cada card eh um "banner" do premio com:
 *   - Header "PRÊMIO" em gold
 *   - Foto (ou troféu fallback)
 *   - Nome
 *   - Combinação de dados para ganhar
 *
 * Comportamento:
 *   - modo rolando (vencedorId=null): scroll continuo vertical
 *     com translate3d + keyframe carrossel-scroll-vertical.
 *   - modo destacado (vencedorId setado): para scroll, transita
 *     suavemente para centralizar o card vencedor (translateY com
 *     transition), aplica glow primary pulsante nele, dim nos
 *     demais.
 *
 * Filtra `e_premio_real=false` (esconde "Nao foi dessa vez").
 *
 * Cores do sistema:
 *   - Borda idle: gold (#f4c430) sutil
 *   - Destaque: primary (turquesa via hsl(var(--primary)))
 *   - Bg painel: gradient secondary
 */
export function CarrosselPremios({
  premios,
  velocidade = 50,
  visiveis = 5,
  vencedorId = null,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [alturaContainer, setAlturaContainer] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Medida imediata para evitar primeiro render com alturaCard=0
    // (cards invisiveis ate o ResizeObserver disparar).
    setAlturaContainer(el.clientHeight);
    const ro = new ResizeObserver(() => setAlturaContainer(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Filtra premios "Nao foi dessa vez" (e_premio_real=false).
  const lista = React.useMemo(
    () => premios.filter((p) => p.e_premio_real),
    [premios],
  );
  const itens = React.useMemo(() => [...lista, ...lista], [lista]);

  if (lista.length === 0) return null;

  const alturaCard = alturaContainer > 0 ? alturaContainer / visiveis : 0;
  const distanciaUmaCopia = lista.length * alturaCard;
  const duracaoSegundos = alturaCard > 0 ? distanciaUmaCopia / velocidade : 30;

  const idxVencedor = vencedorId ? lista.findIndex((p) => p.id === vencedorId) : -1;
  const destacando = idxVencedor >= 0;
  let translateYDestaque = 0;
  if (destacando && alturaCard > 0) {
    const centroContainer = alturaContainer / 2;
    const centroCard = alturaCard * (idxVencedor + 0.5);
    translateYDestaque = centroContainer - centroCard;
  }

  const estiloFaixa: React.CSSProperties = {
    ['--carrossel-scroll-dist' as string]: `${distanciaUmaCopia}px`,
  };
  if (destacando) {
    estiloFaixa.transform = `translateY(${translateYDestaque}px)`;
    estiloFaixa.transition = 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)';
    estiloFaixa.animation = 'none';
  } else if (alturaCard > 0) {
    estiloFaixa.animation = `carrossel-scroll-vertical ${duracaoSegundos}s linear infinite`;
  }

  return (
    <div
      // Painel da sidebar — gradient sutil + ring primary discreto.
      // SEM shadow-lg pra ficar clean. Flex column garante que o
      // header fica fixo no topo e o conteudo de scroll fica abaixo.
      className="flex h-full min-h-0 w-full flex-col overflow-hidden
        rounded-2xl bg-gradient-to-b from-secondary/40 to-secondary/10
        ring-1 ring-primary/15 p-2 gap-2"
      aria-label="Lista de prêmios disponíveis e suas combinações"
    >
      {/* Cabecalho fixo no topo do flex */}
      <div className="flex items-center justify-center gap-1.5 rounded-xl
        bg-card/70 py-2 ring-1 ring-primary/10 backdrop-blur-sm flex-shrink-0">
        <Trophy className="h-3.5 w-3.5 text-[#f4c430]" strokeWidth={2.5} />
        <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
          Prêmios
        </span>
      </div>

      {/* Container do scroll — flex-1 toma o espaco restante.
          ResizeObserver vai pegar o tamanho deste div. */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        {/* Vinhetas fade nas extremidades */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6
            bg-gradient-to-b from-secondary/40 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6
            bg-gradient-to-t from-secondary/40 to-transparent"
        />

        <div className="flex flex-col" style={estiloFaixa}>
          {itens.map((p, i) => {
            const original = i < lista.length;
            const estahDestacado = destacando && original && idxVencedor === i;
            const estahApagado = destacando && !estahDestacado;
            return (
              <div
                key={`${p.id}-${i}`}
                className="px-1 py-1"
                style={{
                  height: alturaCard > 0 ? `${alturaCard}px` : `${100 / visiveis}%`,
                  flexShrink: 0,
                }}
              >
                <CardPremio
                  premio={p}
                  altura={alturaCard - 8}
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
