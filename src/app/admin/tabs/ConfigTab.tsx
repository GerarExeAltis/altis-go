'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import type { LojaDb, FingerprintBloqueadoDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ConfigTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
      <TrocarSenhaAdmin />
      <GerenciarLojas />
      <FingerprintsBloqueados />
    </div>
  );
}

function TrocarSenhaAdmin() {
  const { session } = useAuth();
  const [senhaAtual, setAtual] = React.useState('');
  const [senhaNova, setNova] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);

  const trocar = async () => {
    setMsg(null);
    if (senhaNova.length < 8) { setMsg('Senha precisa de 8+ chars'); return; }
    const validar = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validar-senha-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ senha: senhaAtual }),
    });
    if (!validar.ok) { setMsg('Senha atual inválida.'); return; }
    setMsg('Para trocar a senha, use a CLI: `npm run cli -- definir-senha-admin` (Plano 3).');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Trocar senha admin</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="senha-atual">Senha atual</Label>
          <Input id="senha-atual" type="password" value={senhaAtual} onChange={(e) => setAtual(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha-nova">Nova senha</Label>
          <Input id="senha-nova" type="password" value={senhaNova} onChange={(e) => setNova(e.target.value)} />
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <Button onClick={trocar} disabled={!senhaAtual || !senhaNova}>Trocar</Button>
      </CardContent>
    </Card>
  );
}

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
      <CardHeader><CardTitle className="text-lg">Lojas Altis</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {lojas.map((l) => (
            <li key={l.id} className="flex justify-between border-b py-1">
              <span>{l.nome}</span>
              <span className="text-muted-foreground">{l.cidade ?? '—'}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Button onClick={adicionar} disabled={!nome}>Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
      <CardHeader><CardTitle className="text-lg">Fingerprints bloqueados</CardTitle></CardHeader>
      <CardContent>
        {bloqueados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dispositivo bloqueado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {bloqueados.map((b) => (
              <li key={b.fingerprint} className="flex items-center justify-between border-b py-1">
                <span className="font-mono text-xs">{b.fingerprint.slice(0, 16)}...</span>
                <span className="text-muted-foreground">{b.motivo}</span>
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
