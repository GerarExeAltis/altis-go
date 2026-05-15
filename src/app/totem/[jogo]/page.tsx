'use client';
import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTotem } from '@/contexts/TotemContext';
import { AttractMode } from '@/components/totem/AttractMode';
import { AttractModeDados } from '@/components/totem/AttractModeDados';
import { ErroOverlay } from '@/components/totem/ErroOverlay';
import { useBloqueioSaidaTotem } from '@/hooks/useBloqueioSaidaTotem';
import { ModalSaidaTotem } from '@/components/totem/ModalSaidaTotem';

/**
 * Rota raiz do totem = ATTRACT. Renderiza o componente certo
 * baseado no [jogo] da URL (roleta ou dados). Voltar daqui sai do
 * totem (/, /login) — protegido por senha admin via
 * useBloqueioSaidaTotem + ModalSaidaTotem.
 */
export default function TotemAttractPage() {
  const params = useParams();
  const jogo = (params?.jogo as 'roleta' | 'dados') ?? 'roleta';
  const { state, tocar, premios } = useTotem();
  const router = useRouter();

  const bloqueio = useBloqueioSaidaTotem(true);

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  const Attract = jogo === 'dados' ? AttractModeDados : AttractMode;

  return (
    <>
      <Attract
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
