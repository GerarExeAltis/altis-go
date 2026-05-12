'use client';
import {
  LayoutDashboard, Calendar, Gift, Users, Trophy, ScrollText, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/avatar';

export type AbaAdmin =
  | 'dashboard' | 'eventos' | 'premios' | 'operadores'
  | 'ganhadores' | 'auditoria' | 'config';

interface ItemMenu {
  id: AbaAdmin;
  label: string;
  icone: typeof LayoutDashboard;
}

interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

const GRUPOS: GrupoMenu[] = [
  {
    titulo: 'Operacao',
    itens: [
      { id: 'dashboard',  label: 'Dashboard',  icone: LayoutDashboard },
      { id: 'eventos',    label: 'Eventos',    icone: Calendar },
      { id: 'premios',    label: 'Premios',    icone: Gift },
      { id: 'ganhadores', label: 'Ganhadores', icone: Trophy },
    ],
  },
  {
    titulo: 'Pessoas',
    itens: [
      { id: 'operadores', label: 'Operadores', icone: Users },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { id: 'auditoria', label: 'Auditoria',     icone: ScrollText },
      { id: 'config',    label: 'Configuracoes', icone: Settings },
    ],
  },
];

interface Props {
  abaAtiva: AbaAdmin;
  onChange: (v: AbaAdmin) => void;
}

export function AdminSidebar({ abaAtiva, onChange }: Props) {
  const { user } = useAuth();
  const nomeCurto = user?.email?.split('@')[0] ?? 'operador';

  return (
    <nav
      aria-label="Menu do painel admin"
      className="flex w-60 shrink-0 flex-col border-r border-border/60 bg-card"
    >
      {/* Cabecalho da sidebar */}
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Painel
        </h2>
        <p className="mt-0.5 text-sm font-medium text-foreground">Administrativo</p>
      </div>

      {/* Grupos de menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mb-5 last:mb-0">
            <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {grupo.titulo}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {grupo.itens.map((it) => {
                const Icone = it.icone;
                const ativa = abaAtiva === it.id;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onChange(it.id)}
                      aria-current={ativa ? 'page' : undefined}
                      className={cn(
                        'group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                        ativa
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icone className={cn('h-4 w-4 shrink-0', ativa && 'text-primary')} />
                      {it.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Rodape com usuario logado */}
      <div className="border-t border-border/60 px-3 py-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <Avatar nome={user?.email} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{nomeCurto}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
