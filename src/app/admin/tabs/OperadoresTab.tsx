'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { PerfilOperador } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, UserX } from 'lucide-react';

export function OperadoresTab() {
  const adminClient = useAdminClient();
  const [operadores, setOperadores] = React.useState<PerfilOperador[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [nome, setNome] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('perfis_operadores')
      .select('*').order('criado_em', { ascending: false });
    setOperadores((data as PerfilOperador[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const convidar = async () => {
    if (!adminClient) return;
    setEnviando(true);
    setErro(null);
    try {
      const { error } = await adminClient.auth.signUp({
        email,
        password: crypto.randomUUID() + '!Aa1',
        options: { data: { nome_completo: nome } },
      });
      if (error) throw error;
      setModalAberto(false);
      setEmail(''); setNome('');
      await recarregar();
    } catch (e) {
      setErro((e as { message?: string }).message ?? 'erro');
    } finally {
      setEnviando(false);
    }
  };

  const desativar = async (op: PerfilOperador) => {
    if (!adminClient) return;
    if (!confirm(`Desativar ${op.nome_completo}?`)) return;
    await adminClient.from('perfis_operadores').update({ ativo: false }).eq('id', op.id);
    await recarregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operadores</h2>
          <p className="text-muted-foreground">{operadores.length} cadastrados.</p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-1 h-4 w-4" />Convidar operador
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operadores.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.nome_completo}</TableCell>
              <TableCell>{new Date(o.criado_em).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={o.ativo ? 'success' : 'secondary'}>
                  {o.ativo ? 'Ativo' : 'Desativado'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {o.ativo && (
                  <Button size="sm" variant="ghost" onClick={() => desativar(o)} aria-label="Desativar">
                    <UserX className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onClose={() => setModalAberto(false)}>
          <DialogHeader><DialogTitle>Convidar operador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="op-nome">Nome completo</Label>
              <Input id="op-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-email">E-mail</Label>
              <Input id="op-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button onClick={convidar} disabled={enviando || !email || !nome} className="w-full">
              {enviando ? 'Convidando...' : 'Enviar convite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
