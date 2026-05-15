'use client';
import * as React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { AttractMode } from '@/components/totem/AttractMode';
import { ErroOverlay } from '@/components/totem/ErroOverlay';
import { useBloqueioSaidaTotem } from '@/hooks/useBloqueioSaidaTotem';
import { ModalSaidaTotem } from '@/components/totem/ModalSaidaTotem';
import { useRouter } from 'next/navigation';

/**
 * Rota raiz da roleta = ATTRACT. So aqui o bloqueio com SENHA ADMIN
 * eh armado — voltar daqui sairia pra fora do totem (/, /login),
 * o que exige autorizacao explicita. As outras sub-rotas (qrcode,
 * jogar) tem back natural que vai pra rota anterior do funil — sem
 * senha. Logo, o usuario sempre desce o funil normalmente; so quem
 * tenta efetivamente SAIR do funil precisa de senha.
 */
export default function TotemRoletaAttractPage() {
  const { state, tocar, premios } = useTotem();
  const router = useRouter();

  // Senha admin para sair do totem (so na raiz do funil).
  const bloqueio = useBloqueioSaidaTotem(true);

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  return (
    <>
      <AttractMode
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
