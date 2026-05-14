'use client';
import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/home/GameCard';
import { useAuth } from '@/contexts/AuthContext';
import { AdminButton } from '@/components/admin/AdminButton';
import { JOGOS } from '@/lib/jogos/catalog';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type StatusEvento = 'carregando' | 'sem_evento' | 'sem_premios' | 'pronto';

export default function HomePage() {
  return (
    <AuthGuard>
      <Header rightSlot={<AdminButton />} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Welcome />
      </main>
    </AuthGuard>
  );
}

function Welcome() {
  const { user } = useAuth();
  const nomeCurto = user?.email?.split('@')[0] ?? 'operador';
  const [status, setStatus] = React.useState<StatusEvento>('carregando');

  // Valida pre-condicoes de iniciar um jogo na home antes de liberar o
  // card: precisa de evento ativo + pelo menos 1 premio cadastrado.
  // Se faltar algo, o card aparece desabilitado com o motivo, evitando
  // que o operador entre no totem e fique preso numa tela sem roleta.
  React.useEffect(() => {
    const sb = getSupabaseBrowserClient();
    let alive = true;
    (async () => {
      const { data: evt } = await sb
        .from('eventos').select('id').eq('status', 'ativo').maybeSingle();
      if (!alive) return;
      if (!evt) { setStatus('sem_evento'); return; }
      const { count } = await sb.from('premios')
        .select('id', { count: 'exact', head: true })
        .eq('evento_id', evt.id);
      if (!alive) return;
      setStatus((count ?? 0) > 0 ? 'pronto' : 'sem_premios');
    })();
    return () => { alive = false; };
  }, []);

  const motivoDisabled =
    status === 'carregando' ? 'Carregando…'
    : status === 'sem_evento' ? 'Sem evento ativo — configure no painel'
    : status === 'sem_premios' ? 'Sem prêmios cadastrados — configure no painel'
    : undefined;

  return (
    <section>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {nomeCurto}</h1>
        <p className="mt-2 text-muted-foreground">Escolha um jogo para abrir o totem.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {JOGOS.map((jogo) => {
          const indisponivel = jogo.status !== 'ativo';
          const semConfig = status !== 'pronto';
          return (
            <GameCard
              key={jogo.id}
              href={jogo.hrefTotem}
              icone={jogo.icone}
              titulo={jogo.nome}
              subtitulo={jogo.subtitulo}
              disabled={indisponivel || semConfig}
              badge={jogo.badge}
              textoBotao="Iniciar"
              motivoDisabled={indisponivel ? undefined : motivoDisabled}
            />
          );
        })}
      </div>
    </section>
  );
}
