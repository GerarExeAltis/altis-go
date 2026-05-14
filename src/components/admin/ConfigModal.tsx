'use client';
import * as React from 'react';
import { useTheme } from 'next-themes';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import type { FingerprintBloqueadoDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Settings, Sun, Moon, Monitor, Lock, ShieldAlert, Eye, EyeOff, Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SubAba = 'aparencia' | 'seguranca' | 'dispositivos';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ITENS: Array<{ id: SubAba; label: string; icone: typeof Settings }> = [
  { id: 'aparencia',    label: 'Aparência',   icone: Palette },
  { id: 'seguranca',    label: 'Segurança',   icone: Lock },
  { id: 'dispositivos', label: 'Dispositivos', icone: ShieldAlert },
];

/**
 * Modal de Configuracoes com sidebar interna a esquerda (3 secoes:
 * Aparencia, Seguranca, Dispositivos). Substitui a aba /admin/config
 * antiga — acionado pelo dropdown do usuario na AdminSidebar.
 */
export function ConfigModal({ open, onOpenChange }: Props) {
  const [aba, setAba] = React.useState<SubAba>('aparencia');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="flex h-[80vh] max-w-4xl flex-col p-0"
      >
        <header className="border-b border-border/60 px-6 py-4 pr-12">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Settings className="h-5 w-5" />
            Configurações
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajustes do sistema, segurança e dispositivos.
          </p>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar interna */}
          <aside className="flex w-52 shrink-0 flex-col border-r border-border/60 bg-muted/30">
            <nav className="flex-1 overflow-y-auto p-2">
              <ul className="space-y-1">
                {ITENS.map((it) => {
                  const Icone = it.icone;
                  const ativo = it.id === aba;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => setAba(it.id)}
                        aria-current={ativo ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                          ativo
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icone className="h-4 w-4 shrink-0" />
                        <span>{it.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Conteudo */}
          <div className="flex-1 overflow-y-auto p-6">
            {aba === 'aparencia' && <SecaoAparencia />}
            {aba === 'seguranca' && <SecaoSeguranca />}
            {aba === 'dispositivos' && <SecaoDispositivos />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Aparência ────────────────────────────────────────────────────────── */

function SecaoAparencia() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const opcoes = [
    { id: 'light',  label: 'Claro',   icone: Sun },
    { id: 'dark',   label: 'Escuro',  icone: Moon },
    { id: 'system', label: 'Sistema', icone: Monitor },
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Tema da interface</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Aplica-se ao operador logado. Trocar tema só pelo painel admin
          evita que seja alterado por engano no totem.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {opcoes.map(({ id, label, icone: Icone }) => {
          const ativo = mounted && theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={ativo}
              className={cn(
                'flex flex-col items-center gap-2 rounded-md border border-border/60 p-4 transition-colors',
                ativo ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
            >
              <Icone className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Segurança ────────────────────────────────────────────────────────── */

function SecaoSeguranca() {
  const { session } = useAuth();
  const [senhaAtual, setAtual] = React.useState('');
  const [senhaNova, setNova] = React.useState('');
  const [mostrar1, setMostrar1] = React.useState(false);
  const [mostrar2, setMostrar2] = React.useState(false);
  const [msg, setMsg] = React.useState<{ texto: string; tipo: 'info' | 'erro' } | null>(null);

  const trocar = async () => {
    setMsg(null);
    if (senhaNova.length < 8) {
      setMsg({ texto: 'Senha precisa de 8+ caracteres.', tipo: 'erro' });
      return;
    }
    const validar = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validar-senha-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ senha: senhaAtual }),
    });
    if (!validar.ok) {
      setMsg({ texto: 'Senha atual inválida.', tipo: 'erro' });
      return;
    }
    setMsg({
      texto: 'Para concluir a troca, rode: npm run cli -- definir-senha-admin (Plano 3).',
      tipo: 'info',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Senha do modo admin</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A senha admin desbloqueia operações sensíveis no painel.
        </p>
      </div>
      <CampoSenha
        id="senha-atual"
        label="Senha atual"
        value={senhaAtual}
        onChange={setAtual}
        mostrar={mostrar1}
        onToggle={() => setMostrar1((v) => !v)}
      />
      <CampoSenha
        id="senha-nova"
        label="Nova senha"
        value={senhaNova}
        onChange={setNova}
        mostrar={mostrar2}
        onToggle={() => setMostrar2((v) => !v)}
      />
      {msg && (
        <p className={cn('text-sm', msg.tipo === 'erro' ? 'text-destructive' : 'text-muted-foreground')}>
          {msg.texto}
        </p>
      )}
      <Button onClick={trocar} disabled={!senhaAtual || !senhaNova}>
        Trocar senha
      </Button>
    </div>
  );
}

function CampoSenha({
  id, label, value, onChange, mostrar, onToggle,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; mostrar: boolean; onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={mostrar ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={mostrar ? 'Ocultar caracteres' : 'Exibir caracteres'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Dispositivos ─────────────────────────────────────────────────────── */

function SecaoDispositivos() {
  const adminClient = useAdminClient();
  const [bloqueados, setBloqueados] = React.useState<FingerprintBloqueadoDb[]>([]);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('fingerprints_bloqueados')
      .select('*').order('bloqueado_em', { ascending: false });
    setBloqueados((data as FingerprintBloqueadoDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const desbloquear = async (fp: string) => {
    if (!adminClient) return;
    if (!confirm('Desbloquear esse dispositivo?')) return;
    await adminClient.from('fingerprints_bloqueados').delete().eq('fingerprint', fp);
    await recarregar();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Dispositivos bloqueados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fingerprints bloqueados por suspeita de fraude. Desbloqueio é manual.
        </p>
      </div>
      {bloqueados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum dispositivo bloqueado.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-md border border-border/60">
          {bloqueados.map((b) => (
            <li key={b.fingerprint} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {b.fingerprint.slice(0, 16)}…
              </span>
              <span className="flex-1 text-muted-foreground">{b.motivo}</span>
              <Button size="sm" variant="ghost" onClick={() => desbloquear(b.fingerprint)}>
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
