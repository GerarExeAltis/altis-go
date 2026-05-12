'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function UserMenu() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
        <User className="h-4 w-4" />
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sair">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
