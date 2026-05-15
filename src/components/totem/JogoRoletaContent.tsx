'use client';
import * as React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { RoletaCanvas } from '@/components/totem/roleta/RoletaCanvas';
import { usarAnimacaoRoleta } from '@/components/totem/roleta/usarAnimacaoRoleta';
import { ModalResultadoPremio } from '@/components/jogos/ModalResultadoPremio';

/**
 * Conteudo da tela /totem/roleta/jogar — animacao da roleta + modal
 * de resultado. Extraido em componente pra que /totem/[jogo]/jogar/
 * page.tsx faca apenas o switch entre roleta/dados.
 */
export function JogoRoletaContent() {
  const {
    state,
    dispatch,
    premios,
    premioVencedorId,
    premioSorteado,
    jogadorNome,
    setJogadorNome,
    iniciando,
    dispararJogo,
    onAnimacaoConcluir,
  } = useTotem();
  const { reduzir } = usePreferredMotion();

  const { rodaRef, iniciar } = usarAnimacaoRoleta({
    premios,
    premioVencedorId,
    reduzir,
    onConcluir: onAnimacaoConcluir,
  });

  React.useEffect(() => {
    if (state.tipo === 'girando') iniciar();
  }, [state.tipo, iniciar]);

  if (
    state.tipo !== 'pronta_para_girar' &&
    state.tipo !== 'girando' &&
    state.tipo !== 'finalizada'
  ) {
    return null;
  }

  const aguardandoToque = state.tipo === 'pronta_para_girar';

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-background">
      <h2 className="p-6 text-center text-4xl font-bold tracking-tight">
        {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
      </h2>
      <div className="h-full w-full">
        <RoletaCanvas premios={premios} rodaRef={rodaRef} />
      </div>
      <div className="flex items-center justify-center p-6">
        {aguardandoToque && (
          <button
            type="button"
            onClick={dispararJogo}
            disabled={iniciando}
            className="inline-flex h-20 items-center justify-center gap-3 rounded-2xl bg-primary px-16 text-3xl font-bold text-primary-foreground shadow-2xl shadow-primary/40 ring-2 ring-primary/40 transition-all hover:scale-105 active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            aria-label="Girar a roleta"
          >
            GIRAR
          </button>
        )}
      </div>

      {state.tipo === 'finalizada' && premioSorteado && (
        <ModalResultadoPremio
          premioNome={premioSorteado.nome}
          ePremioReal={premioSorteado.e_premio_real}
          premioFotoPath={premioSorteado.foto_path}
          jogadorNome={jogadorNome}
          onFinalizar={() => {
            setJogadorNome(null);
            dispatch({ tipo: 'AUTO_RETORNO' });
          }}
        />
      )}
    </div>
  );
}
