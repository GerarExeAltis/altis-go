'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogoAltis } from '@/components/LogoAltis';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';

/**
 * Pagina destino do link de invite/recuperacao de senha do Supabase.
 *
 * Fluxo:
 *   1. Operador recebe email com link de "Aceitar convite".
 *   2. Supabase processa o token no fragmento da URL (#access_token=...)
 *      e o SDK do navegador faz signIn automatico via onAuthStateChange.
 *   3. Esta pagina aguarda a sessao virar valida (getSession retorna nao-null).
 *   4. Operador define a senha; chamamos auth.updateUser({ password }).
 *   5. Redireciona pra home.
 *
 * Cobre 3 estados:
 *   - 'processando': aguardando o SDK processar o hash.
 *   - 'pronto': sessao ativa, mostra form de senha.
 *   - 'expirado': token invalido/expirado, mostra mensagem de erro.
 */

type Estado = 'processando' | 'pronto' | 'expirado' | 'salvando' | 'sucesso';

const MIN_SENHA = 8;

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const sb = getSupabaseBrowserClient();
  const [estado, setEstado] = React.useState<Estado>('processando');
  const [senha, setSenha] = React.useState('');
  const [confirma, setConfirma] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);

  // 1) Aguardar a sessao se materializar a partir do hash do link.
  React.useEffect(() => {
    let alive = true;
    let timeout: number | null = null;

    const checar = async () => {
      const { data } = await sb.auth.getSession();
      if (!alive) return;
      if (data.session) {
        setEstado('pronto');
      } else {
        // Da ate 3s pro SDK processar o hash; se nao logou, o link
        // ja foi usado, expirou, ou eh invalido.
        timeout = window.setTimeout(() => {
          if (alive) setEstado('expirado');
        }, 3000);
      }
    };

    checar();
    const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) => {
      if (!alive) return;
      if (sess) {
        if (timeout) window.clearTimeout(timeout);
        setEstado('pronto');
      }
    });
    return () => {
      alive = false;
      if (timeout) window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  const salvar = async () => {
    setErro(null);
    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirma) {
      setErro('As senhas não coincidem.');
      return;
    }
    setEstado('salvando');
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) {
      setErro(error.message);
      setEstado('pronto');
      return;
    }
    setEstado('sucesso');
    window.setTimeout(() => router.replace('/'), 1500);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoAltis size={96} />
          <h1 className="text-2xl font-bold tracking-tight">AltisGo</h1>
          <p className="text-sm text-muted-foreground">Defina sua senha de acesso</p>
        </div>

        {estado === 'processando' && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card p-6 text-center">
            <KeyRound className="h-8 w-8 animate-pulse text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validando convite...</p>
          </div>
        )}

        {estado === 'expirado' && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">
              Link inválido ou expirado.
            </p>
            <p className="text-xs text-muted-foreground">
              Peça ao administrador para reenviar o convite.
            </p>
            <Button variant="outline" onClick={() => router.replace('/login')}>
              Ir para login
            </Button>
          </div>
        )}

        {(estado === 'pronto' || estado === 'salvando') && (
          <div className="space-y-3 rounded-md border border-border bg-card p-6">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_SENHA}
                disabled={estado === 'salvando'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirma">Confirmar senha</Label>
              <Input
                id="confirma"
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                autoComplete="new-password"
                disabled={estado === 'salvando'}
                onKeyDown={(e) => { if (e.key === 'Enter') salvar(); }}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button onClick={salvar} disabled={estado === 'salvando'} className="w-full">
              {estado === 'salvando' ? 'Salvando...' : 'Definir senha e entrar'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Mínimo {MIN_SENHA} caracteres.
            </p>
          </div>
        )}

        {estado === 'sucesso' && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-green-500/30 bg-green-500/10 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium">Senha definida com sucesso!</p>
            <p className="text-xs text-muted-foreground">Redirecionando...</p>
          </div>
        )}
      </div>
    </main>
  );
}
