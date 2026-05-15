'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TotemProvider } from '@/contexts/TotemContext';

/**
 * Layout compartilhado entre todas as sub-rotas da roleta:
 *   /totem-roleta         (attract)
 *   /totem-roleta/qrcode  (QR Code + aguardando dados do celular)
 *   /totem-roleta/jogar   (jogo em andamento + resultado)
 *
 * O TotemProvider mantem o state machine + efeitos compartilhados
 * (premios, realtime, qrUrl, etc) e sincroniza o state.tipo com a
 * rota — voltar/avancar do navegador reflete o funil do jogo.
 */
export default function TotemRoletaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TotemProvider tipoJogo="roleta" baseRoute="/totem-roleta">
        {children}
      </TotemProvider>
    </AuthGuard>
  );
}
