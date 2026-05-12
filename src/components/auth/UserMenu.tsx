'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function UserMenu() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      aria-label="Sair"
      title="Sair"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
