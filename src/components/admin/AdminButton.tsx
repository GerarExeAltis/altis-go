'use client';
import * as React from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { AdminModal } from './AdminModal';
import { AdminBadge } from './AdminBadge';

export function AdminButton() {
  const [open, setOpen] = React.useState(false);
  const { modoAdmin } = useAdmin();
  const { session } = useAuth();
  if (!session) return null;

  if (modoAdmin) return <AdminBadge />;
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Modo admin">
        <Shield className="mr-1 h-4 w-4" />
        Admin
      </Button>
      <AdminModal open={open} onOpenChange={setOpen} accessToken={session.access_token} />
    </>
  );
}
