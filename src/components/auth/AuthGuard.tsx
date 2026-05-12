'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';
import { useMinLoading } from '@/hooks/useMinLoading';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const router = useRouter();
  const mostrarLoading = useMinLoading(loading);

  React.useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  if (mostrarLoading) return <Loading ariaLabel="Conferindo sua sessao" />;
  if (!session) return <Loading ariaLabel="Redirecionando" />;
  return <>{children}</>;
}
