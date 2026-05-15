'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAdmin } from '@/contexts/AdminContext';
import type { PerfilOperador } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, UserX, MailCheck } from 'lucide-react';
import { convidarOperador } from '@/lib/admin/edgeFunctions';

export function OperadoresTab() {
  const adminClient = useAdminClient();
  const { adminJwt } = useAdmin();
  const [operadores, setOperadores] = React.useState<PerfilOperador[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [nome, setNome] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [conviteEnviado, setConviteEnviado] = React.useState<string | null>(null);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('perfis_operadores')
      .select('*').order('criado_em', { ascending: false });
    setOperadores((data as PerfilOperador[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const convidar = async () => {
    if (!adminJwt) return;
    setEnviando(true);
    setErro(null);
    try {
      // URL absoluta da pagina onde o operador vai cair apos clicar
      // no link do email. Em prod, precisa estar na whitelist do
      // Supabase (SITE_URL / Additional Redirect URLs).
      const redirectTo = `${window.location.origin}/redefinir-senha`;
      await convidarOperador(adminJwt, email, nome, redirectTo);
      setConviteEnviado(email);
      setModalAberto(false);
      setEmail(''); setNome('');
      await recarregar();
      window.setTimeout(() => setConviteEnviado(null), 6000);
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

      {conviteEnviado && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
          <MailCheck className="h-4 w-4" />
          Convite enviado para <strong>{conviteEnviado}</strong>. O operador receberá um e-mail com link para definir a senha.
        </div>
      )}

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
            <p className="text-xs text-muted-foreground">
              Um e-mail será enviado com link para o operador definir a senha de acesso.
            </p>
            <Button onClick={convidar} disabled={enviando || !email || !nome || !adminJwt} className="w-full">
              {enviando ? 'Enviando convite...' : 'Enviar convite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
