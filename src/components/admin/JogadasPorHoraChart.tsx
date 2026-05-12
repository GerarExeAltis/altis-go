'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  dados: { hora: string; total: number }[];
}

export function JogadasPorHoraChart({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem jogadas registradas hoje.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados}>
        <XAxis dataKey="hora" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="total" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
