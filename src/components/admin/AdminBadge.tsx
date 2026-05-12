'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { cn } from '@/lib/utils';

function format(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function AdminBadge() {
  const { segundosRestantes, desativar } = useAdmin();
  const pathname = usePathname();
  const noPainel = pathname?.startsWith('/admin') ?? false;

  return (
    <div className="flex items-center gap-2">
      {!noPainel && (
        <Link
          href="/admin"
          aria-label="Abrir painel administrativo"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <LayoutDashboard className="mr-1 h-4 w-4" />
          Painel
        </Link>
      )}
      <div className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>Admin {format(segundosRestantes)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={desativar}
          aria-label="Sair do modo admin"
        >
          <LogOut className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
