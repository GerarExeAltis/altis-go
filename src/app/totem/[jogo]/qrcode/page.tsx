'use client';
import * as React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { ErroOverlay } from '@/components/totem/ErroOverlay';

/**
 * Sub-rota /totem/[jogo]/qrcode — generica para roleta e dados.
 * O QrCodeScreen eh identico nos dois jogos; o que diferencia eh o
 * basePath na URL do QR (calculado no TotemProvider via tipoJogo).
 */
export default function TotemQrCodePage() {
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
