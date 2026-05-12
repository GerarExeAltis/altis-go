'use client';
import * as React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
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
      <Header rightSlot={<AdminButton />} />
      <AdminGate />
    </AuthGuard>
  );
}

function AdminGate() {
  const { modoAdmin } = useAdmin();
  const [aba, setAba] = React.useState<AbaAdmin>('dashboard');

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
    <AdminLayout abaAtiva={aba} onAbaChange={setAba}>
      {aba === 'dashboard' && <DashboardTab />}
      {aba === 'eventos' && <EventosTab />}
      {aba === 'premios' && <PremiosTab />}
      {aba === 'operadores' && <OperadoresTab />}
      {aba === 'ganhadores' && <GanhadoresTab />}
      {aba === 'auditoria' && <AuditoriaTab />}
      {aba === 'config' && <ConfigTab />}
    </AdminLayout>
  );
}
