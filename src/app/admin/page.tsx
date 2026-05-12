'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdmin } from '@/contexts/AdminContext';

export default function AdminPage() {
  return (
    <AuthGuard>
      <Header rightSlot={<AdminButton />} />
      <AdminGate />
    </AuthGuard>
  );
}

function AdminGate() {
  const { modoAdmin } = useAdmin();
  if (!modoAdmin) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Você precisa estar em <strong>Modo Admin</strong> para acessar esta área.
          Clique em &quot;Admin&quot; no cabeçalho.
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <p className="mt-2 text-muted-foreground">Conteúdo do painel será implementado no Plano 6.</p>
    </main>
  );
}
