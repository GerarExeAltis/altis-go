'use client';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  nome: z.string().trim().min(2),
  descricao: z.string().nullable().optional(),
  peso_base: z.number().int().min(0, 'peso deve ser >= 0'),
  estoque_inicial: z.number().int().min(0),
  ordem_roleta: z.number().int().default(0),
  e_premio_real: z.boolean().default(true),
}).refine(
  (v) => v.e_premio_real ? v.estoque_inicial > 0 : true,
  { path: ['estoque_inicial'], message: 'prêmio real precisa de estoque > 0' }
);

export type PremioFormPayload = z.infer<typeof schema>;

interface Props {
  valoresIniciais?: Partial<PremioFormPayload>;
  onSubmit: (data: PremioFormPayload, foto?: File) => void;
  enviando?: boolean;
}

export function PremioForm({ valoresIniciais, onSubmit, enviando }: Props) {
  const [foto, setFoto] = React.useState<File | null>(null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<PremioFormPayload>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '', descricao: '',
      peso_base: 1, estoque_inicial: 1, ordem_roleta: 0,
      e_premio_real: true,
      ...valoresIniciais,
    },
  });

  const submit = (data: PremioFormPayload) => onSubmit(data, foto ?? undefined);

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome do prêmio</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" rows={2} {...register('descricao')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="peso">Peso (probabilidade)</Label>
          <Input id="peso" type="number" min={0} {...register('peso_base', { valueAsNumber: true })} />
          {errors.peso_base && <p className="text-sm text-destructive">{errors.peso_base.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estoque">Estoque inicial</Label>
          <Input
            id="estoque"
            type="number"
            min={0}
            {...register('estoque_inicial', { valueAsNumber: true })}
          />
          {errors.estoque_inicial &&
            <p className="text-sm text-destructive">{errors.estoque_inicial.message}</p>}
        </div>
      </div>

      <Controller
        name="e_premio_real"
        control={control}
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="slot_vazio"
              checked={!field.value}
              onChange={(e) => field.onChange(!e.target.checked)}
              className="mt-1 h-5 w-5 cursor-pointer rounded border border-input"
            />
            <label htmlFor="slot_vazio" className="cursor-pointer select-none text-sm leading-tight">
              Slot <strong>&quot;Não ganha nada&quot;</strong> — desmarque para prêmio real
            </label>
          </div>
        )}
      />

      <div className="space-y-1.5">
        <Label htmlFor="foto">Foto do prêmio (PNG/JPEG/WEBP, máx 5MB)</Label>
        <Input
          id="foto" type="file" accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
