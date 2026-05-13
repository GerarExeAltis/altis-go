'use client';
import * as React from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdminClient } from '@/hooks/useAdminClient';
import { useAdmin } from '@/contexts/AdminContext';
import type { PremioDb } from '@/lib/admin/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PremioForm, type PremioFormPayload } from '@/components/admin/PremioForm';
import { uploadFotoPremio } from '@/lib/admin/uploadFoto';
import { Plus, Edit, GripVertical, Trash2, Minus } from 'lucide-react';

interface ItemProps {
  premio: PremioDb;
  ganhadoresCount: number;
  onEditar: () => void;
  onExcluir: () => void;
  onAjustarEstoque: (delta: number) => void;
}

function ItemSortavel({
  premio, ganhadoresCount, onEditar, onExcluir, onAjustarEstoque,
}: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: premio.id });

  // 'sorteados' = ganhadores reais (fonte: tabela ganhadores).
  const sorteados = ganhadoresCount;
  const semEstoque = premio.estoque_inicial === 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border border-border/60 bg-card p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="h-8 w-8 rounded ring-1 ring-border/60"
        style={{ backgroundColor: premio.cor_hex ?? '#cccccc' }}
        aria-hidden
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">
          {premio.nome}
          {!premio.e_premio_real && <Badge variant="secondary">Slot vazio</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          peso {premio.peso_base} · sorteados {sorteados}/{premio.estoque_inicial}
        </div>
      </div>

      {premio.e_premio_real && !semEstoque && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAjustarEstoque(-1)}
            disabled={premio.estoque_atual === 0}
            aria-label="Diminuir estoque"
            title="Diminuir estoque"
            className="h-7 w-7 p-0"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[3.5rem] text-center font-mono text-sm font-semibold tabular-nums">
            {premio.estoque_atual}/{premio.estoque_inicial}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAjustarEstoque(+1)}
            disabled={premio.estoque_atual >= premio.estoque_inicial}
            aria-label="Aumentar estoque"
            title="Aumentar estoque"
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Button size="sm" variant="ghost" onClick={onEditar} aria-label="Editar">
        <Edit className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onExcluir} aria-label="Excluir">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function PremiosTab() {
  const adminClient = useAdminClient();
  const { adminJwt } = useAdmin();
  const [eventoId, setEventoId] = React.useState<string | null>(null);
  const [premios, setPremios] = React.useState<PremioDb[]>([]);
  const [ganhadoresPorPremio, setGanhadoresPorPremio] = React.useState<Record<string, number>>({});
  const [modalAberto, setModalAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<PremioDb | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const recarregar = React.useCallback(async () => {
    if (!adminClient) return;
    const { data: evt } = await adminClient.from('eventos').select('id').eq('status', 'ativo').maybeSingle();
    if (!evt) {
      setEventoId(null);
      setPremios([]);
      setGanhadoresPorPremio({});
      return;
    }
    setEventoId(evt.id);
    const { data } = await adminClient.from('premios')
      .select('*').eq('evento_id', evt.id).order('ordem_roleta');
    setPremios((data as PremioDb[]) ?? []);

    // Conta ganhadores reais por premio — fonte da verdade para 'sorteados',
    // independente do estoque_atual (que pode estar dessincronizado por
    // edicoes do estoque_inicial).
    const { data: gs } = await adminClient
      .from('ganhadores')
      .select('premio_id')
      .eq('evento_id', evt.id);
    const contagem: Record<string, number> = {};
    for (const g of (gs ?? []) as Array<{ premio_id: string }>) {
      contagem[g.premio_id] = (contagem[g.premio_id] ?? 0) + 1;
    }
    setGanhadoresPorPremio(contagem);
  }, [adminClient]);

  React.useEffect(() => { recarregar(); }, [recarregar]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!adminClient) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = premios.findIndex((p) => p.id === active.id);
    const newIdx = premios.findIndex((p) => p.id === over.id);
    const novoArr = arrayMove(premios, oldIdx, newIdx);
    setPremios(novoArr);
    await Promise.all(
      novoArr.map((p, i) => adminClient.from('premios').update({ ordem_roleta: i }).eq('id', p.id))
    );
  };

  const salvar = async (form: PremioFormPayload, foto?: File) => {
    if (!adminClient || !eventoId) return;
    setEnviando(true);
    setErro(null);
    try {
      let premioId = editando?.id;

      if (editando) {
        // Preserva ganhadores existentes ao mudar o estoque_inicial.
        // 'consumidos' = quantos ja sairam (fonte: tabela ganhadores,
        // mais confiavel que estoque_inicial_antigo - estoque_atual_antigo
        // caso ja exista divergencia).
        const consumidos = ganhadoresPorPremio[editando.id] ?? 0;
        const novoAtual = Math.max(0, form.estoque_inicial - consumidos);
        const { error } = await adminClient.from('premios')
          .update({
            ...form,
            estoque_atual: novoAtual,
          })
          .eq('id', editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await adminClient.from('premios')
          .insert({
            ...form,
            evento_id: eventoId,
            estoque_atual: form.estoque_inicial,
          })
          .select('id').single();
        if (error) throw error;
        premioId = (data as { id: string }).id;
      }

      if (foto && premioId && adminJwt) {
        const path = await uploadFotoPremio(adminJwt, premioId, foto);
        await adminClient.from('premios').update({ foto_path: path }).eq('id', premioId);
      }

      setModalAberto(false);
      setEditando(null);
      await recarregar();
    } catch (e) {
      setErro((e as { message?: string }).message ?? 'erro');
    } finally {
      setEnviando(false);
    }
  };

  const ajustarEstoque = async (premio: PremioDb, delta: number) => {
    if (!adminClient) return;
    const novo = Math.min(
      premio.estoque_inicial,
      Math.max(0, premio.estoque_atual + delta)
    );
    if (novo === premio.estoque_atual) return;
    // Update otimista
    setPremios((arr) => arr.map((p) => p.id === premio.id ? { ...p, estoque_atual: novo } : p));
    const { error } = await adminClient
      .from('premios')
      .update({ estoque_atual: novo })
      .eq('id', premio.id);
    if (error) {
      // Reverte em caso de erro
      setPremios((arr) => arr.map((p) => p.id === premio.id ? { ...p, estoque_atual: premio.estoque_atual } : p));
      alert(`Falha ao ajustar estoque: ${error.message}`);
    }
  };

  const excluir = async (premio: PremioDb) => {
    if (!adminClient) return;
    if (!confirm(`Excluir o prêmio "${premio.nome}"? Esta ação é irreversível.`)) return;
    const { error } = await adminClient.from('premios').delete().eq('id', premio.id);
    if (error) {
      alert(`Falha: ${error.message}\n(prêmios com ganhadores não podem ser excluídos)`);
      return;
    }
    await recarregar();
  };

  if (!eventoId) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Prêmios</h2>
        <p className="mt-2 text-muted-foreground">
          Nenhum evento ativo. Crie/ative um evento antes de cadastrar prêmios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prêmios</h2>
          <p className="text-muted-foreground">Arraste para reordenar na roleta.</p>
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true); }}>
          <Plus className="mr-1 h-4 w-4" />Novo prêmio
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={premios.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {premios.map((p) => (
              <ItemSortavel
                key={p.id}
                premio={p}
                ganhadoresCount={ganhadoresPorPremio[p.id] ?? 0}
                onEditar={() => { setEditando(p); setModalAberto(true); }}
                onExcluir={() => excluir(p)}
                onAjustarEstoque={(d) => ajustarEstoque(p, d)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onClose={() => setModalAberto(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar prêmio' : 'Novo prêmio'}</DialogTitle>
          </DialogHeader>
          {erro && <p className="mb-2 text-sm text-destructive">{erro}</p>}
          <PremioForm
            onSubmit={salvar}
            enviando={enviando}
            valoresIniciais={editando ? {
              nome: editando.nome,
              descricao: editando.descricao ?? '',
              cor_hex: editando.cor_hex ?? '#4afad4',
              peso_base: editando.peso_base,
              estoque_inicial: editando.estoque_inicial,
              ordem_roleta: editando.ordem_roleta,
              e_premio_real: editando.e_premio_real,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
