'use client';
import * as React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { ErroOverlay } from '@/components/totem/ErroOverlay';

export default function TotemDadosQrCodePage() {
  const { state, qrUrl, conectado, graceInicial } = useTotem();

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  if (state.tipo !== 'aguardando_celular' && state.tipo !== 'aguardando_dados') {
    return null;
  }

  if (!conectado && !graceInicial) {
    return <ErroOverlay mensagem="Aguardando conexão com servidor..." />;
  }

  return (
    <QrCodeScreen
      url={qrUrl}
      expiraEm={state.expiraEm}
      aguardandoDados={state.tipo === 'aguardando_dados'}
    />
  );
}
