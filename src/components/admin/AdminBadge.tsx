'use client';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';

function format(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function AdminBadge() {
  const { segundosRestantes, desativar } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const noPainel = pathname?.startsWith('/admin') ?? false;

  const sair = () => {
    desativar();
    if (noPainel) router.push('/');
  };

  return (
    <div className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
      <ShieldCheck className="h-4 w-4" />
      <span>Admin {format(segundosRestantes)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={sair}
        aria-label="Sair do modo admin"
      >
        <LogOut className="h-3 w-3" />
      </Button>
    </div>
  );
}
