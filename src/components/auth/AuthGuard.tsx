'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  if (loading) return <Loading ariaLabel="Conferindo sua sessao" />;
  if (!session) return <Loading ariaLabel="Redirecionando" />;
  return <>{children}</>;
}
