'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Loading } from '@/components/ui/Loading';
import { useMinLoading } from '@/hooks/useMinLoading';

type Perfil = 'carregando' | 'sem_perfil' | 'inativo' | 'ativo';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, session, signOut } = useAuth();
  const router = useRouter();
  const mostrarLoading = useMinLoading(loading);
  const [perfil, setPerfil] = React.useState<Perfil>('carregando');

  React.useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  // Apos ter sessao, valida que o usuario possui perfil em
  // perfis_operadores E que o perfil esta ativo. Conta no auth.users
  // sem perfil aprovado nao tem acesso ao app (defense em profundidade
  // contra signup direto via Dashboard sem passar pelo fluxo admin).
  React.useEffect(() => {
    if (loading || !session) return;
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      const { data } = await sb
        .from('perfis_operadores')
        .select('ativo')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!alive) return;
      if (!data) {
        setPerfil('sem_perfil');
        return;
      }
      setPerfil(data.ativo ? 'ativo' : 'inativo');
    })();
    return () => { alive = false; };
  }, [loading, session]);

  if (mostrarLoading) return <Loading ariaLabel="Conferindo sua sessao" />;
  if (!session) return <Loading ariaLabel="Redirecionando" />;

  if (perfil === 'carregando') {
    return <Loading ariaLabel="Validando seu perfil" />;
  }

  if (perfil === 'sem_perfil' || perfil === 'inativo') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-3xl font-bold text-destructive">Acesso negado</h1>
        <p className="max-w-md text-muted-foreground">
          {perfil === 'sem_perfil'
            ? 'Sua conta de autenticação existe, mas você ainda não foi cadastrado como operador.'
            : 'Seu perfil de operador está inativo.'}
          {' '}Procure um administrador para liberar o acesso.
        </p>
        <button
          type="button"
          onClick={() => { signOut(); router.replace('/login'); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md"
        >
          Sair e voltar ao login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
