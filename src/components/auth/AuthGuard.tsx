'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Loading } from '@/components/ui/Loading';
import { useMinLoading } from '@/hooks/useMinLoading';

type Perfil = 'carregando' | 'sem_acesso' | 'ativo';

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

  // Apos ter sessao, valida que o usuario possui perfil ativo em
  // perfis_operadores. Sem perfil OU perfil inativo => signOut silencioso
  // e volta para /login. NAO mostramos mensagens distintas ("nao tem
  // perfil" vs "inativo") para nao vazar informacao a um atacante que
  // sabe que credenciais foram aceitas pelo Auth mas barradas pelo app
  // — a tela de login sempre mostra "Credenciais inválidas" generico.
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
      const ok = !!data?.ativo;
      setPerfil(ok ? 'ativo' : 'sem_acesso');
      if (!ok) {
        // Encerra a sessao e volta ao login sem expor o motivo.
        await signOut();
        router.replace('/login?erro=credenciais');
      }
    })();
    return () => { alive = false; };
  }, [loading, session, signOut, router]);

  if (mostrarLoading) return <Loading ariaLabel="Conferindo sua sessao" />;
  if (!session) return <Loading ariaLabel="Redirecionando" />;
  if (perfil !== 'ativo') return <Loading ariaLabel="Redirecionando" />;

  return <>{children}</>;
}
