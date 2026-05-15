'use client';
import * as React from 'react';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  open: boolean;
  onLiberar: () => void;
  onCancelar: () => void;
}

/**
 * Modal que pede senha para liberar a saida do totem. Aceita tanto a
 * senha do operador logado (validada via supabase.auth.signInWithPassword
 * em um cliente isolado para nao mexer na sessao atual) quanto a senha
 * do modo admin (validada via Edge Function validar-senha-admin).
 *
 * O cliente isolado e criado com persistSession:false para nao gravar
 * cookies/localStorage — usado apenas para fazer um signIn temporario
 * e confirmar que a senha esta correta, sem invalidar tokens do
 * cliente principal.
 */
export function ModalSaidaTotem({ open, onLiberar, onCancelar }: Props) {
  const { session, user } = useAuth();
  const [senha, setSenha] = React.useState('');
  const [mostrar, setMostrar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const emailOperador = user?.email ?? '';
  const accessToken = session?.access_token ?? '';

  const validar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      // 1) Tenta como senha admin (mais comum para liberar saida)
      const resAdmin = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validar-senha-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ senha }),
        },
      );
      if (resAdmin.ok) {
        onLiberar();
        return;
      }

      // 2) Tenta como senha do operador logado (cliente isolado)
      if (emailOperador) {
        const sbTemp = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { error } = await sbTemp.auth.signInWithPassword({
          email: emailOperador,
          password: senha,
        });
        if (!error) {
          onLiberar();
          return;
        }
      }

      setErro('Senha inválida.');
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // Limpa o input ao reabrir
  React.useEffect(() => {
    if (open) {
      setSenha('');
      setErro(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancelar(); }}>
      <DialogContent onClose={onCancelar}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sair do totem
          </DialogTitle>
          <DialogDescription>
            Para sair desta tela, digite a senha do operador ou a senha de admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={validar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha-saida">Senha</Label>
            <div className="relative">
              <Input
                id="senha-saida"
                type={mostrar ? 'text' : 'password'}
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={enviando}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                aria-label={mostrar ? 'Ocultar caracteres' : 'Exibir caracteres'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || senha.length === 0}>
              {enviando ? 'Validando...' : 'Liberar saída'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
