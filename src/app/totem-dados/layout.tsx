'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TotemProvider } from '@/contexts/TotemContext';

/**
 * Layout compartilhado entre todas as sub-rotas do jogo de dados:
 *   /totem-dados         (attract)
 *   /totem-dados/qrcode  (QR Code + aguardando dados do celular)
 *   /totem-dados/jogar   (lance dos dados + resultado)
 */
export default function TotemDadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TotemProvider tipoJogo="dados" baseRoute="/totem-dados">
        {children}
      </TotemProvider>
    </AuthGuard>
  );
}
