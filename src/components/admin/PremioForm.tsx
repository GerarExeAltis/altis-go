'use client';
import * as React from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { urlFotoPremio } from '@/lib/storage/fotoPremio';
import { ImageIcon, X } from 'lucide-react';

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
  /** Path no Storage da foto atual (ao editar) — exibida como preview enquanto nao trocar. */
  fotoPathAtual?: string | null;
  onSubmit: (data: PremioFormPayload, foto?: File) => void;
  enviando?: boolean;
}

const FORMATOS_LABEL = 'PNG, JPEG ou WEBP — máx. 5MB';
const FORMATOS_ACEITOS = 'image/png,image/jpeg,image/webp';

export function PremioForm({ valoresIniciais, fotoPathAtual, onSubmit, enviando }: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [foto, setFoto] = React.useState<File | null>(null);
  const [previewNovo, setPreviewNovo] = React.useState<string | null>(null);
  const urlAtual = React.useMemo(() => urlFotoPremio(fotoPathAtual), [fotoPathAtual]);
  const previewUrl = previewNovo ?? urlAtual;

  // Cleanup do objectURL ao trocar arquivo / desmontar (evita memory leak)
  React.useEffect(() => {
    if (!foto) return;
    const url = URL.createObjectURL(foto);
    setPreviewNovo(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const abrirFilePicker = () => fileInputRef.current?.click();
  const limparFoto = () => {
    setFoto(null);
    setPreviewNovo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      {/* Foto ao lado do nome — bloco superior do form */}
      <div className="flex items-end gap-3">
        {/* Botao-foto: clica para trocar, X para remover. Tooltip nativo informa formatos. */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={abrirFilePicker}
            aria-label={previewUrl ? 'Trocar foto do prêmio' : 'Adicionar foto do prêmio'}
            title={FORMATOS_LABEL}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 transition-colors hover:border-primary hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt="Foto do prêmio"
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                />
                {/* Hover overlay com texto "Trocar" */}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Trocar
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-7 w-7" aria-hidden />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Adicionar
                </span>
              </span>
            )}
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={limparFoto}
              aria-label="Remover foto"
              title="Remover foto"
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow ring-1 ring-border transition-colors hover:bg-destructive hover:text-destructive-foreground hover:ring-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Input file invisivel, acionado pelo botao-foto */}
          <input
            ref={fileInputRef}
            type="file"
            accept={FORMATOS_ACEITOS}
            className="sr-only"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="nome">Nome do prêmio</Label>
          <Input id="nome" {...register('nome')} />
          {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
        </div>
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
          <label
            htmlFor="slot_vazio"
            className="flex cursor-pointer select-none items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              id="slot_vazio"
              checked={!field.value}
              onChange={(e) => field.onChange(!e.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border border-input"
            />
            <span>
              Slot <strong>&quot;Não ganha nada&quot;</strong> — desmarque para prêmio real
            </span>
          </label>
        )}
      />

      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
