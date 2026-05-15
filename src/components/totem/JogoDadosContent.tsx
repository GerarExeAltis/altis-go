'use client';
import * as React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { usePreferredMotion } from '@/hooks/usePreferredMotion';
import { SwipeAreaDados } from '@/components/totem/dados/SwipeAreaDados';
import { CarrosselPremios } from '@/components/totem/dados/CarrosselPremios';
import { ModalResultadoPremio } from '@/components/jogos/ModalResultadoPremio';
import { parDoPremio } from '@/lib/jogos/dadosMapeamento';
import { DieFace } from '@/components/ui/DieFace';

/**
 * Conteudo da tela /totem/dados/jogar — dados 3D + carrossel +
 * banner de resultado. Espelha JogoRoletaContent mas com a UI
 * especifica do jogo de dados.
 */
export function JogoDadosContent() {
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

  const [dadosPousaram, setDadosPousaram] = React.useState(false);
  React.useEffect(() => {
    if (state.tipo !== 'pronta_para_girar' && state.tipo !== 'girando' && state.tipo !== 'finalizada') {
      setDadosPousaram(false);
    }
  }, [state.tipo]);

  const onConcluirDados = React.useCallback(() => {
    setDadosPousaram(true);
    onAnimacaoConcluir();
  }, [onAnimacaoConcluir]);

  if (
    state.tipo !== 'pronta_para_girar' &&
    state.tipo !== 'girando' &&
    state.tipo !== 'finalizada'
  ) {
    return null;
  }

  const aguardandoToque = state.tipo === 'pronta_para_girar';

  const premioVencedor = premioVencedorId
    ? premios.find((p) => p.id === premioVencedorId)
    : null;
  const parDados = premioVencedor ? parDoPremio(premioVencedor) : undefined;

  return (
    <div className="grid h-screen w-full min-w-0 grid-cols-[320px_1fr] gap-3 overflow-hidden bg-background p-3">
      <aside className="h-full min-h-0">
        <CarrosselPremios
          premios={premios}
          velocidade={50}
          visiveis={5}
          vencedorId={dadosPousaram ? premioVencedorId : null}
        />
      </aside>

      <main className="grid min-w-0 grid-rows-[auto_1fr_auto]">
        <h2 className="px-4 pt-4 pb-2 text-center text-4xl font-bold tracking-tight">
          {jogadorNome ? `Boa sorte, ${jogadorNome}!` : 'Boa sorte!'}
        </h2>
        <SwipeAreaDados
          aguardandoToque={aguardandoToque}
          iniciando={iniciando}
          onLancar={dispararJogo}
          iniciarLance={state.tipo === 'girando'}
          premios={premios}
          premioVencedorId={premioVencedorId}
          reduzirMovimento={reduzir}
          onConcluir={onConcluirDados}
        />
        <div className="flex min-h-[72px] items-center justify-center px-4 pb-4 pt-2">
          {aguardandoToque && !iniciando && (
            <p className="text-lg font-medium text-muted-foreground animate-[attract-glow_2.4s_ease-in-out_infinite]">
              🎲 Toque na tela para lançar
            </p>
          )}
          {iniciando && !dadosPousaram && (
            <p className="text-lg font-medium text-muted-foreground animate-[attract-glow_2.4s_ease-in-out_infinite]">
              Rolando...
            </p>
          )}
          {dadosPousaram && parDados && (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-card px-6 py-3">
              <span className="text-xl font-extrabold uppercase tracking-wide text-primary">
                Você tirou
              </span>
              <DieFace valor={parDados[0]} tamanho={42} />
              <span className="text-2xl font-bold text-muted-foreground">+</span>
              <DieFace valor={parDados[1]} tamanho={42} />
            </div>
          )}
        </div>
      </main>

      {state.tipo === 'finalizada' && premioSorteado && (
        <ModalResultadoPremio
          premioNome={premioSorteado.nome}
          ePremioReal={premioSorteado.e_premio_real}
          premioFotoPath={premioSorteado.foto_path}
          jogadorNome={jogadorNome}
          parDados={parDados}
          onFinalizar={() => {
            setJogadorNome(null);
            dispatch({ tipo: 'AUTO_RETORNO' });
          }}
        />
      )}
    </div>
  );
}
