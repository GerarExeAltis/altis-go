'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/Header';
import { AdminButton } from '@/components/admin/AdminButton';

export default function TotemPage() {
  return (
    <AuthGuard>
      <Header rightSlot={<AdminButton />} />
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Totem</h1>
          <p className="mt-2 text-muted-foreground">Roleta 3D será implementada no Plano 5.</p>
        </div>
      </main>
    </AuthGuard>
  );
}
