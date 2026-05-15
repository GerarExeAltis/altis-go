'use client';
import * as React from 'react';

/**
 * Intercepta o "voltar" do navegador enquanto o totem esta em uma
 * fase intermediaria (QR Code ou aguardando dados do celular) e
 * cancela a sessao em vez de deixar o usuario sair pra rota anterior.
 *
 * Sem este hook, em /totem-roleta?fase=qr o operador apertava voltar
 * e ia parar em / (home) ou /login — perdia o totem.
 * Com este hook, o voltar dispara `aoVoltar()` (tipicamente
 * dispatch RESET) que faz o totem retornar pro attract — fase
 * "logicamente anterior" no fluxo do jogo.
 *
 * Funciona empurrando uma entrada "amortecedora" no history quando
 * `ativo` vira true. O proximo back consome essa entrada e dispara
 * popstate, onde chamamos aoVoltar() em vez de deixar sair.
 *
 * Combina com useBloqueioSaidaTotem (que cuida das fases de jogo
 * em andamento, onde voltar pede senha admin). Os dois hooks ativam
 * em estados DISJUNTOS — nunca os dois simultaneamente.
 */
export function useVoltarParaAttract(
  ativo: boolean,
  aoVoltar: () => void,
): void {
  // Mantemos aoVoltar em ref pra nao trocar listener a cada render
  // (callback pode mudar de identidade se nao for useCallback).
  const aoVoltarRef = React.useRef(aoVoltar);
  React.useEffect(() => { aoVoltarRef.current = aoVoltar; }, [aoVoltar]);

  React.useEffect(() => {
    if (!ativo) return;
    if (typeof window === 'undefined') return;

    // Entrada amortecedora no history. Sem ela, o primeiro back ja
    // levaria pra rota anterior — perdiamos o totem.
    window.history.pushState({ totemFase: 'qr' }, '', window.location.href);

    const onPopState = () => {
      // Re-empurra a URL atual: nao queremos que o usuario "saia"
      // visualmente da rota do totem. Apenas dispatchar a acao.
      window.history.pushState({ totemFase: 'qr' }, '', window.location.href);
      aoVoltarRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [ativo]);
}
