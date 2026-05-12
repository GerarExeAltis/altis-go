'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';

export function UserMenu() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  const nomeCurto = user.email?.split('@')[0] ?? 'operador';

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 sm:flex">
        <Avatar nome={user.email} size={32} />
        <span className="text-sm font-medium">{nomeCurto}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
