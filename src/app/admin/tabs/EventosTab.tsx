'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { EventoDb, EventoStatus } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { EventoForm, type EventoFormPayload } from '@/components/admin/EventoForm';
import { HistoricoEventoModal } from '@/components/admin/HistoricoEventoModal';
import { Plus, Edit, BarChart3 } from 'lucide-react';

function corStatus(s: EventoStatus): 'default' | 'secondary' | 'destructive' | 'success' | 'outline' {
  if (s === 'ativo') return 'success';
  if (s === 'encerrado') return 'secondary';
  if (s === 'pausado') return 'outline';
  return 'default';
}

export function EventosTab() {
  const adminClient = useAdminClient();
  const [eventos, setEventos] = React.useState<EventoDb[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<EventoDb | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [historicoEvento, setHistoricoEvento] = React.useState<EventoDb | null>(null);

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('eventos')
      .select('*').order('criado_em', { ascending: false });
    setEventos((data as EventoDb[]) ?? []);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const salvar = async (form: EventoFormPayload) => {
    if (!adminClient) return;
    setEnviando(true);
    setErro(null);
    try {
      if (editando) {
        const { error } = await adminClient.from('eventos').update(form).eq('id', editando.id);
        if (error) throw error;
      } else {
        const { data: u } = await adminClient.auth.getUser();
        const { error } = await adminClient.from('eventos').insert({
          ...form, criado_por: u.user?.id,
        });
        if (error) throw error;
      }
      setModalAberto(false);
      setEditando(null);
      await recarregar();
    } catch (e) {
      const msg = (e as { message?: string }).message ?? 'erro';
      if (msg.includes('unq_evento_ativo')) {
        setErro('Já existe um evento ativo. Pause-o antes de ativar outro.');
      } else {
        setErro(msg);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Eventos</h2>
          <p className="text-muted-foreground">{eventos.length} eventos cadastrados.</p>
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true); }}>
          <Plus className="mr-1 h-4 w-4" />Novo evento
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.nome}</TableCell>
              <TableCell>{e.data_inicio}</TableCell>
              <TableCell>{e.data_fim}</TableCell>
              <TableCell>
                <Badge variant={corStatus(e.status)}>{e.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1">
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setHistoricoEvento(e)}
                    aria-label="Ver historico"
                    title="Ver historico"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => { setEditando(e); setModalAberto(true); }}
                    aria-label="Editar"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <HistoricoEventoModal
        evento={historicoEvento}
        open={!!historicoEvento}
        onOpenChange={(o) => !o && setHistoricoEvento(null)}
      />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onClose={() => setModalAberto(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          </DialogHeader>
          {erro && <p className="mb-2 text-sm text-destructive">{erro}</p>}
          <EventoForm
            onSubmit={salvar}
            enviando={enviando}
            valoresIniciais={editando ? {
              nome: editando.nome,
              descricao: editando.descricao ?? '',
              data_inicio: editando.data_inicio,
              data_fim: editando.data_fim,
              status: editando.status,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
