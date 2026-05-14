'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/home/GameCard';
import { useAuth } from '@/contexts/AuthContext';
import { AdminButton } from '@/components/admin/AdminButton';
import { JOGOS } from '@/lib/jogos/catalog';

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
  return (
    <section>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {nomeCurto}</h1>
        <p className="mt-2 text-muted-foreground">Escolha um jogo para abrir o totem.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {JOGOS.map((jogo) => (
          <GameCard
            key={jogo.id}
            href={jogo.hrefTotem}
            icone={jogo.icone}
            titulo={jogo.nome}
            subtitulo={jogo.subtitulo}
            disabled={jogo.status !== 'ativo'}
            badge={jogo.badge}
          />
        ))}
      </div>
    </section>
  );
}
