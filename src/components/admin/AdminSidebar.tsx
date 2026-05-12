'use client';
import {
  LayoutDashboard, Calendar, Gift, Users, Trophy, ScrollText, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AbaAdmin =
  | 'dashboard' | 'eventos' | 'premios' | 'operadores'
  | 'ganhadores' | 'auditoria' | 'config';

interface ItemMenu {
  id: AbaAdmin;
  label: string;
  icone: typeof LayoutDashboard;
}

const ITENS: ItemMenu[] = [
  { id: 'dashboard',  label: 'Dashboard',      icone: LayoutDashboard },
  { id: 'eventos',    label: 'Eventos',        icone: Calendar },
  { id: 'premios',    label: 'Prêmios',        icone: Gift },
  { id: 'operadores', label: 'Operadores',     icone: Users },
  { id: 'ganhadores', label: 'Ganhadores',     icone: Trophy },
  { id: 'auditoria',  label: 'Auditoria',      icone: ScrollText },
  { id: 'config',     label: 'Configurações',  icone: Settings },
];

interface Props {
  abaAtiva: AbaAdmin;
  onChange: (v: AbaAdmin) => void;
}

export function AdminSidebar({ abaAtiva, onChange }: Props) {
  return (
    <nav
      aria-label="Menu do painel admin"
      className="flex w-56 shrink-0 flex-col gap-1 border-r bg-card p-3"
    >
      {ITENS.map((it) => {
        const Icone = it.icone;
        const ativa = abaAtiva === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-current={ativa ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
              ativa
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icone className="h-4 w-4" />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
