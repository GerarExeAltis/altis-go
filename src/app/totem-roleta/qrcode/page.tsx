'use client';
import * as React from 'react';
import { useTotem } from '@/contexts/TotemContext';
import { QrCodeScreen } from '@/components/totem/QrCodeScreen';
import { ErroOverlay } from '@/components/totem/ErroOverlay';

/**
 * Sub-rota /totem-roleta/qrcode — exibe o QR Code enquanto aguarda
 * o jogador escanear no celular e submeter os dados. Voltar daqui
 * vai pra rota raiz (attract) automaticamente pelo Next router —
 * sem necessidade de modal, ja eh natural.
 */
export default function TotemRoletaQrCodePage() {
  const { state, qrUrl, conectado, graceInicial } = useTotem();

  if (state.tipo === 'erro') {
    return <ErroOverlay mensagem={state.mensagem} />;
  }

  // Se chegou aqui sem o state estar nas fases de QR (ex: URL direta
  // ou refresh), o TotemProvider ja vai redirecionar via router.replace
  // — renderizamos null nesse intervalo para evitar flash.
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
