'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Gift, Users, Trophy, ScrollText,
  ShieldCheck, LogOut, Settings, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Avatar } from '@/components/ui/avatar';
import { ConfigModal } from '@/components/admin/ConfigModal';

export type AbaAdmin =
  | 'dashboard' | 'eventos' | 'premios' | 'operadores'
  | 'ganhadores' | 'auditoria';

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
      { id: 'auditoria', label: 'Auditoria', icone: ScrollText },
    ],
  },
];

interface Props {
  abaAtiva: AbaAdmin;
  onChange: (v: AbaAdmin) => void;
}

function formatTempo(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function AdminSidebar({ abaAtiva, onChange }: Props) {
  const { user } = useAuth();
  const { segundosRestantes, desativar } = useAdmin();
  const router = useRouter();
  const nomeCurto = user?.email?.split('@')[0] ?? 'operador';

  const [dropdownAberto, setDropdownAberto] = React.useState(false);
  const [configAberto, setConfigAberto] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  React.useEffect(() => {
    if (!dropdownAberto) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownAberto]);

  const sairDoModoAdmin = () => {
    setDropdownAberto(false);
    desativar();
    router.push('/');
  };

  const abrirConfig = () => {
    setDropdownAberto(false);
    setConfigAberto(true);
  };

  return (
    <>
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

        {/* Rodape: usuario com dropdown (Configuracoes + Sair) */}
        <div className="relative border-t border-border/60 px-3 py-3" ref={dropdownRef}>
          {dropdownAberto && (
            <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              <button
                type="button"
                onClick={abrirConfig}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Configurações
              </button>
              <button
                type="button"
                onClick={sairDoModoAdmin}
                className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sair do modo admin
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDropdownAberto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={dropdownAberto}
            title="Abrir menu do usuario"
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors',
              dropdownAberto ? 'bg-muted' : 'hover:bg-muted'
            )}
          >
            <Avatar nome={user?.email} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{nomeCurto}</p>
              <p className="flex items-center gap-1 truncate text-xs text-primary">
                <ShieldCheck className="h-3 w-3" />
                Admin {formatTempo(segundosRestantes)}
              </p>
            </div>
            <ChevronUp
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                !dropdownAberto && 'rotate-180'
              )}
            />
          </button>
        </div>
      </nav>

      <ConfigModal open={configAberto} onOpenChange={setConfigAberto} />
    </>
  );
}
