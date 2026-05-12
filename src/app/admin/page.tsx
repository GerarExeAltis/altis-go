'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ErrorPage } from '@/components/ErrorPage';
import type { AbaAdmin } from '@/components/admin/AdminSidebar';
import { DashboardTab } from './tabs/DashboardTab';
import { EventosTab } from './tabs/EventosTab';
import { PremiosTab } from './tabs/PremiosTab';
import { OperadoresTab } from './tabs/OperadoresTab';
import { GanhadoresTab } from './tabs/GanhadoresTab';
import { AuditoriaTab } from './tabs/AuditoriaTab';
import { ConfigTab } from './tabs/ConfigTab';

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminGate />
    </AuthGuard>
  );
}

function AdminGate() {
  const { modoAdmin } = useAdmin();
  const router = useRouter();
  const [aba, setAba] = React.useState<AbaAdmin>('dashboard');

  // Rastreia se modoAdmin JA esteve true nesta sessao da rota. Se um dia esteve
  // e agora nao esta, e porque o usuario clicou em 'Sair do modo admin' enquanto
  // dentro do /admin — redirecionamos imediatamente, sem mostrar a tela 403
  // (evita flash do erro logo apos o desativar).
  const eraAdminRef = React.useRef(modoAdmin);
  React.useEffect(() => {
    if (eraAdminRef.current && !modoAdmin) {
      router.replace('/');
    } else if (modoAdmin) {
      eraAdminRef.current = true;
    }
  }, [modoAdmin, router]);

  // Acesso direto via URL sem nunca ter sido admin -> 403
  if (!modoAdmin && !eraAdminRef.current) {
    return (
      <>
        <Header rightSlot={<AdminButton />} />
        <ErrorPage
          variant={403}
          descricao='Esta area exige modo admin ativo. Clique em "Admin" no cabecalho e informe a senha.'
        />
      </>
    );
  }

  // Esta saindo (ja foi admin, deixou de ser): mostra nada enquanto redireciona
  if (!modoAdmin) return null;

  return (
    <>
      <Header rightSlot={<AdminButton />} />
      <AdminLayout abaAtiva={aba} onAbaChange={setAba}>
        {aba === 'dashboard' && <DashboardTab />}
        {aba === 'eventos' && <EventosTab />}
        {aba === 'premios' && <PremiosTab />}
        {aba === 'operadores' && <OperadoresTab />}
        {aba === 'ganhadores' && <GanhadoresTab />}
        {aba === 'auditoria' && <AuditoriaTab />}
        {aba === 'config' && <ConfigTab />}
      </AdminLayout>
    </>
  );
}
