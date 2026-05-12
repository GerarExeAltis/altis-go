'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { GanhadorDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface GanhadorComPremio extends GanhadorDb {
  premio_nome: string;
  e_premio_real: boolean;
}

export function GanhadoresTab() {
  const adminClient = useAdminClient();
  const [ganhadores, setGanhadores] = React.useState<GanhadorComPremio[]>([]);
  const [filtro, setFiltro] = React.useState<'pendentes' | 'entregues' | 'todos'>('pendentes');

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data } = await adminClient.from('ganhadores')
      .select('*, premios!inner(nome, e_premio_real)')
      .order('ganho_em', { ascending: false });
    const arr = (data ?? []) as unknown as Array<
      GanhadorDb & { premios: { nome: string; e_premio_real: boolean }
                          | { nome: string; e_premio_real: boolean }[] }
    >;
    setGanhadores(arr.map((g) => {
      const p = Array.isArray(g.premios) ? g.premios[0] : g.premios;
      return { ...g, premio_nome: p?.nome ?? '', e_premio_real: !!p?.e_premio_real };
    }));
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const marcarEntregue = async (g: GanhadorComPremio) => {
    if (!adminClient) return;
    const obs = prompt('Observações (opcional):') ?? '';
    const { data: u } = await adminClient.auth.getUser();
    const { error } = await adminClient.from('ganhadores').update({
      entregue: true,
      entregue_em: new Date().toISOString(),
      entregue_por: u.user?.id,
      observacoes: obs || null,
    }).eq('id', g.id);
    if (error) {
      alert(`Falha: ${error.message}`);
      return;
    }
    await recarregar();
  };

  const filtrados = ganhadores.filter((g) => {
    if (!g.e_premio_real) return false;
    if (filtro === 'pendentes') return !g.entregue;
    if (filtro === 'entregues') return g.entregue;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ganhadores / Entrega</h2>
        <p className="text-muted-foreground">{filtrados.length} ganhadores listados.</p>
      </div>
      <div className="flex gap-2">
        {(['pendentes', 'entregues', 'todos'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? 'default' : 'outline'}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Prêmio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtrados.map((g) => (
            <TableRow key={g.id}>
              <TableCell>{new Date(g.ganho_em).toLocaleString()}</TableCell>
              <TableCell className="font-medium">{g.jogador_nome}</TableCell>
              <TableCell className="font-mono text-xs">{g.jogador_telefone}</TableCell>
              <TableCell>{g.premio_nome}</TableCell>
              <TableCell>
                {g.entregue ? (
                  <Badge variant="success">Entregue</Badge>
                ) : (
                  <Badge variant="default">Pendente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {!g.entregue && (
                  <Button size="sm" onClick={() => marcarEntregue(g)}>
                    Marcar entregue
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
