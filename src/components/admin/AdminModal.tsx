'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Shield, Eye, EyeOff } from 'lucide-react';

export function AdminModal({
  open, onOpenChange, accessToken,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accessToken: string;
}) {
  const { ativar } = useAdmin();
  const router = useRouter();
  const [senha, setSenha] = React.useState('');
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validar-senha-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setErro('Muitas tentativas. Tente novamente em 30 minutos.');
        } else {
          setErro('Senha inválida.');
        }
        return;
      }
      const { token, exp } = (await res.json()) as { token: string; exp: number };
      ativar(token, exp);
      setSenha('');
      onOpenChange(false);
      router.push('/admin');
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Modo Administrador
          </DialogTitle>
          <DialogDescription>
            Esta área é restrita. Digite a senha de admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha-admin">Senha</Label>
            <div className="relative">
              <Input
                id="senha-admin"
                type={mostrarSenha ? 'text' : 'password'}
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={enviando}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}

          <p className="text-xs text-muted-foreground">
            ⚠ Após 5 tentativas falhas, o IP é bloqueado por 30min.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || senha.length === 0}>
              {enviando ? 'Verificando...' : 'Desbloquear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
