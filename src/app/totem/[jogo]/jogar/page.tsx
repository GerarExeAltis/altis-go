'use client';
import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTotem } from '@/contexts/TotemContext';
import { ErroOverlay } from '@/components/totem/ErroOverlay';
import { useBloqueioSaidaTotem } from '@/hooks/useBloqueioSaidaTotem';
import { ModalConfirmacaoVoltar } from '@/components/totem/ModalConfirmacaoVoltar';
import { JogoRoletaContent } from '@/components/totem/JogoRoletaContent';
import { JogoDadosContent } from '@/components/totem/JogoDadosContent';

/**
 * /totem/[jogo]/jogar — tela de jogo em andamento. Renderiza o
 * conteudo especifico de cada jogo (roleta ou dados) baseado no
 * params.jogo da URL. O state machine compartilhado vive no Provider
 * (TotemContext).
 *
 * Trava de voltar:
 *  - Apertar voltar do navegador abre ModalConfirmacaoVoltar
 *    ("Tem certeza que deseja voltar?").
 *  - Confirmar -> dispatch RESET -> state vira attract -> provider
 *    redireciona pra /totem/[jogo] (raiz, attract).
 *  - Cancelar -> fecha modal, jogo continua.
 */
export default function TotemJogarPage() {
  const params = useParams();
  const jogo = (params?.jogo as 'roleta' | 'dados') ?? 'roleta';
  const { state, dispatch } = useTotem();

  const bloqueio = useBloqueioSaidaTotem(true);

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  return (
    <>
      {jogo === 'dados' ? <JogoDadosContent /> : <JogoRoletaContent />}
      <ModalConfirmacaoVoltar
        open={bloqueio.modalAberto}
        onCancelar={bloqueio.fecharModal}
        onConfirmar={() => bloqueio.liberar(() => dispatch({ tipo: 'RESET' }))}
      />
    </>
  );
}
