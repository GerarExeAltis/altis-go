'use client';
import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useDashboardMetricas } from '@/hooks/useDashboardMetricas';
import { useMinLoading } from '@/hooks/useMinLoading';
import { MetricCard } from '@/components/admin/MetricCard';
import { JogadasPorHoraChart } from '@/components/admin/JogadasPorHoraChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/Loading';
import { Trophy, Heart, Package, Activity } from 'lucide-react';

export function DashboardTab() {
  const [eventoId, setEventoId] = React.useState<string | null>(null);
  const [eventoNome, setEventoNome] = React.useState<string>('');

  React.useEffect(() => {
    const sb = getSupabaseBrowserClient();
    sb.from('eventos')
      .select('id, nome')
      .eq('status', 'ativo')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEventoId(data.id);
          setEventoNome(data.nome);
        }
      });
  }, []);

  const { data, loading } = useDashboardMetricas(eventoId);
  const mostrarLoading = useMinLoading(loading || !data);

  if (!eventoId) {
    return <p className="text-muted-foreground">Nenhum evento ativo no momento.</p>;
  }
  if (mostrarLoading || !data) {
    return <Loading fullscreen={false} ariaLabel="Carregando metricas" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Evento: {eventoNome}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard titulo="Total de jogadas" valor={data.jogadasTotal} icone={Activity} />
        <MetricCard titulo="Ganharam prêmio" valor={data.ganhadoresReais} icone={Trophy} />
        <MetricCard titulo={'"Não foi dessa vez"'} valor={data.naoFoi} icone={Heart} />
        <MetricCard
          titulo="Entregues / pendentes"
          valor={`${data.entregues} / ${data.pendentes}`}
          icone={Package}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jogadas por hora (hoje)</CardTitle>
        </CardHeader>
        <CardContent>
          <JogadasPorHoraChart dados={data.jogadasPorHora} />
        </CardContent>
      </Card>
    </div>
  );
}
