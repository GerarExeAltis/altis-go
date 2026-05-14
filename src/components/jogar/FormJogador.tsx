'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const DDDS = new Set([
  '11','12','13','14','15','16','17','18','19','21','22','24','27','28',
  '31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49',
  '51','53','54','55','61','62','64','63','65','66','67','68','69',
  '71','73','74','75','77','79','81','87','82','83','84','85','88','86','89',
  '91','93','94','92','97','95','96','98','99',
]);

const schema = z.object({
  nome: z.string().trim().min(3, 'nome muito curto').max(80),
  telefone: z.string().transform((v) => v.replace(/\D+/g, '')).pipe(
    z.string()
      .regex(/^\d{11}$/, 'telefone precisa de 11 dígitos')
      .refine((v) => DDDS.has(v.slice(0, 2)), 'DDD inválido')
      .refine((v) => v[2] === '9', 'celular precisa começar com 9 após DDD')
  ),
  email: z.string().email('e-mail inválido'),
  empresa: z.string().trim().max(120).optional(),
  lgpd: z.boolean().refine((v) => v === true, 'Você precisa aceitar a Política de Privacidade.'),
});
type FormValues = z.infer<typeof schema>;

export interface DadosForm {
  nome: string;
  telefone: string;
  email: string;
  empresa: string | null;
}

interface Props {
  onSubmit: (dados: DadosForm) => void;
  enviando?: boolean;
}

export function FormJogador({ onSubmit, enviando }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', telefone: '', email: '', empresa: '', lgpd: false },
  });

  const submit = (data: FormValues) => {
    onSubmit({
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      empresa: data.empresa && data.empresa.length > 0 ? data.empresa : null,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" autoComplete="name" {...register('nome')} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone">Telefone / WhatsApp</Label>
        <Input
          id="telefone"
          type="tel"
          inputMode="numeric"
          placeholder="(54) 9 8888-7777"
          autoComplete="tel-national"
          {...register('telefone')}
        />
        {errors.telefone && <p className="text-sm text-destructive">{errors.telefone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="empresa">Empresa (opcional)</Label>
        <Input
          id="empresa"
          type="text"
          autoComplete="organization"
          placeholder="Nome da empresa onde você trabalha"
          {...register('empresa')}
        />
        {errors.empresa && <p className="text-sm text-destructive">{errors.empresa.message}</p>}
      </div>

      <Checkbox
        {...register('lgpd')}
        label={
          <span>
            Li e <strong>aceito</strong> a coleta dos meus dados conforme a Política de Privacidade
            da Altis para contato sobre o prêmio.
          </span>
        }
      />
      {errors.lgpd && <p className="text-sm text-destructive">{errors.lgpd.message}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Participar'}
      </Button>
    </form>
  );
}
