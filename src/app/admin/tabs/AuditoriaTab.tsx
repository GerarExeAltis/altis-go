'use client';
import * as React from 'react';
import { useAdminClient } from '@/hooks/useAdminClient';
import type { AuditoriaDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 50;

export function AuditoriaTab() {
  const adminClient = useAdminClient();
  const [pagina, setPagina] = React.useState(0);
  const [registros, setRegistros] = React.useState<AuditoriaDb[]>([]);
  const [temMais, setTemMais] = React.useState(false);

  React.useEffect(() => {
    if (!adminClient) return;
    let alive = true;
    (async () => {
      const inicio = pagina * PAGE_SIZE;
      const fim = inicio + PAGE_SIZE - 1;
      const { data } = await adminClient.from('auditoria')
        .select('*').order('criado_em', { ascending: false }).range(inicio, fim);
      if (!alive) return;
      const arr = (data as AuditoriaDb[]) ?? [];
      setRegistros(arr);
      setTemMais(arr.length === PAGE_SIZE);
    })();
    return () => { alive = false; };
  }, [adminClient, pagina]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Auditoria</h2>
        <p className="text-muted-foreground">Histórico de ações sensíveis (read-only).</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Ator</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(r.criado_em).toLocaleString()}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.acao}</TableCell>
              <TableCell className="font-mono text-xs">
                {r.ator?.slice(0, 8) ?? '—'}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.ip ?? '—'}</TableCell>
              <TableCell className="text-xs">
                <details>
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    ver
                  </summary>
                  <pre className="mt-1 max-w-md overflow-auto rounded-md border border-border/60 bg-muted/40 p-2 font-mono text-[11px]">
                    {JSON.stringify(r.detalhes, null, 2)}
                  </pre>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline"
          disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
          ← Anterior
        </Button>
        <span className="text-sm text-muted-foreground">Página {pagina + 1}</span>
        <Button size="sm" variant="outline"
          disabled={!temMais} onClick={() => setPagina((p) => p + 1)}>
          Próximo →
        </Button>
      </div>
    </div>
  );
}
