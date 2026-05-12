'use client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

interface Props {
  dados: { hora: string; total: number }[];
}

export function JogadasPorHoraChart({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem jogadas registradas hoje.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-jogadas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity={0.95} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="hora"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border) / 0.6)',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(var(--popover-foreground))',
            boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
          }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Bar
          dataKey="total"
          fill="url(#grad-jogadas)"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
