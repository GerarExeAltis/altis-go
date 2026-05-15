'use client';
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  /** Confirma o voltar: o jogo eh cancelado e o totem volta pra attract. */
  onConfirmar: () => void;
  /** Cancela: fecha o modal e mantem o jogo em andamento. */
  onCancelar: () => void;
}

/**
 * Modal de confirmacao exibido quando o operador aperta voltar
 * durante uma fase ATIVA do jogo (pronta_para_girar, girando ou
 * finalizada). Substitui a antiga senha admin — em vez de exigir
 * autenticacao, apenas pede confirmacao "Tem certeza?".
 *
 * Motivacao: a senha admin era pesada para uma acao reversivel.
 * O jogador ainda nao recebeu o premio; um aviso visual claro
 * sobre o impacto ("vai perder a chance") eh suficiente.
 */
export function ModalConfirmacaoVoltar({ open, onConfirmar, onCancelar }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancelar(); }}>
      <DialogContent onClose={onCancelar}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Tem certeza que deseja voltar?
          </DialogTitle>
          <DialogDescription>
            O jogador perderá a chance e a sessão atual será cancelada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancelar}>
            Continuar jogando
          </Button>
          <Button variant="destructive" onClick={onConfirmar}>
            Sim, voltar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
