'use client';
import * as React from 'react';
import { useTheme } from 'next-themes';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import type { LojaDb, FingerprintBloqueadoDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sun, Moon, Monitor, Lock, Store, ShieldAlert, Eye, EyeOff, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

type SubAba = 'aparencia' | 'seguranca' | 'lojas' | 'dispositivos';

export function ConfigTab() {
  const [aba, setAba] = React.useState<SubAba>('aparencia');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Ajustes do sistema, segurança e dispositivos.
        </p>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as SubAba)}>
        <TabsList>
          <TabsTrigger value="aparencia">
            <Palette className="mr-1.5 h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="seguranca">
            <Lock className="mr-1.5 h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="lojas">
            <Store className="mr-1.5 h-4 w-4" />
            Lojas
          </TabsTrigger>
          <TabsTrigger value="dispositivos">
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            Dispositivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aparencia">
          <TemaSecao />
        </TabsContent>
        <TabsContent value="seguranca">
          <TrocarSenhaAdmin />
        </TabsContent>
        <TabsContent value="lojas">
          <GerenciarLojas />
        </TabsContent>
        <TabsContent value="dispositivos">
          <FingerprintsBloqueados />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Aparência ────────────────────────────────────────────────────────── */

function TemaSecao() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const opcoes = [
    { id: 'light',  label: 'Claro',   icone: Sun },
    { id: 'dark',   label: 'Escuro',  icone: Moon },
    { id: 'system', label: 'Sistema', icone: Monitor },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tema da interface</CardTitle>
        <CardDescription>
          Aplica-se ao operador logado. Trocar tema só pelo painel admin
          evita que seja alterado por engano no totem.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

/* ── Segurança (senha admin) ──────────────────────────────────────────── */

function TrocarSenhaAdmin() {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Senha do modo admin</CardTitle>
        <CardDescription>
          A senha admin desbloqueia operações sensíveis no painel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
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

/* ── Lojas ────────────────────────────────────────────────────────────── */

function GerenciarLojas() {
  const adminClient = useAdminClient();
  const [lojas, setLojas] = React.useState<LojaDb[]>([]);
  const [nome, setNome] = React.useState('');
  const [cidade, setCidade] = React.useState('');

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('lojas').select('*').order('nome');
    setLojas((data as LojaDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const adicionar = async () => {
    if (!adminClient || !nome) return;
    await adminClient.from('lojas').insert({ nome, cidade: cidade || null });
    setNome(''); setCidade('');
    await recarregar();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lojas Altis</CardTitle>
        <CardDescription>
          Lojas exibidas no formulário do jogador (campo opcional).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lojas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {lojas.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{l.nome}</span>
                <span className="text-muted-foreground">{l.cidade ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Nome da loja" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Button onClick={adicionar} disabled={!nome}>Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Dispositivos bloqueados ──────────────────────────────────────────── */

function FingerprintsBloqueados() {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dispositivos bloqueados</CardTitle>
        <CardDescription>
          Fingerprints bloqueados por suspeita de fraude. Desbloqueio é manual.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
