'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const schema = z.object({
  nome: z.string().trim().min(3, 'mínimo 3 caracteres'),
  descricao: z.string().nullable().optional(),
  data_inicio: z.string().min(1, 'data início obrigatória'),
  data_fim: z.string().min(1, 'data fim obrigatória'),
  status: z.enum(['rascunho', 'ativo', 'pausado', 'encerrado']),
}).refine(
  (v) => new Date(v.data_fim) >= new Date(v.data_inicio),
  { path: ['data_fim'], message: 'fim deve ser após início' }
);

export type EventoFormPayload = z.infer<typeof schema>;

interface Props {
  valoresIniciais?: Partial<EventoFormPayload>;
  onSubmit: (data: EventoFormPayload) => void;
  enviando?: boolean;
}

export function EventoForm({ valoresIniciais, onSubmit, enviando }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<EventoFormPayload>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'rascunho',
      ...valoresIniciais,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome do evento</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" rows={3} {...register('descricao')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="data_inicio">Data de início</Label>
          <Input id="data_inicio" type="date" {...register('data_inicio')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data_fim">Data de fim</Label>
          <Input id="data_fim" type="date" {...register('data_fim')} />
          {errors.data_fim && <p className="text-sm text-destructive">{errors.data_fim.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...register('status')}>
          <option value="rascunho">Rascunho</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="encerrado">Encerrado</option>
        </Select>
      </div>
      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
