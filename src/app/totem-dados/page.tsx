'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTotem } from '@/contexts/TotemContext';
import { AttractModeDados } from '@/components/totem/AttractModeDados';
import { ErroOverlay } from '@/components/totem/ErroOverlay';
import { useBloqueioSaidaTotem } from '@/hooks/useBloqueioSaidaTotem';
import { ModalSaidaTotem } from '@/components/totem/ModalSaidaTotem';

/**
 * Rota raiz do jogo de dados = ATTRACT. So aqui o bloqueio com
 * senha admin eh armado — voltar daqui sai do totem (/, /login).
 * Sub-rotas (qrcode, jogar) tem back natural pra rota anterior do
 * funil sem senha.
 */
export default function TotemDadosAttractPage() {
  const { state, tocar, premios } = useTotem();
  const router = useRouter();

  const bloqueio = useBloqueioSaidaTotem(true);

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  return (
    <>
      <AttractModeDados
        onTocar={tocar}
        disabled={state.tipo === 'criando_sessao'}
        premios={premios}
      />
      <ModalSaidaTotem
        open={bloqueio.modalAberto}
        onCancelar={bloqueio.fecharModal}
        onLiberar={() => bloqueio.liberar(() => router.push('/'))}
      />
    </>
  );
}
