import { service } from './supabase';
import { randomUUID } from 'node:crypto';

const sb = service();

/** Cria evento de teste e retorna ID. Status='rascunho' para não conflitar com seed ativo. */
export async function criarEventoTest(): Promise<{ eventoId: string; operadorId: string }> {
  const operadorId = '00000000-0000-0000-0000-000000000001'; // dev do seed
  const eventoId = randomUUID();
  const { error } = await sb.from('eventos').insert({
    id: eventoId,
    nome: `Test ${eventoId.slice(0, 8)}`,
    data_inicio: new Date().toISOString().slice(0, 10),
    data_fim: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    status: 'rascunho',
    criado_por: operadorId,
  });
  if (error) throw new Error(`criarEventoTest: ${error.message}`);
  return { eventoId, operadorId };
}

export async function criarPremioTest(
  eventoId: string,
  opts: { peso?: number; estoque?: number; real?: boolean; nome?: string; ordem?: number } = {}
): Promise<string> {
  const id = randomUUID();
  const { error } = await sb.from('premios').insert({
    id,
    evento_id: eventoId,
    nome: opts.nome ?? `Premio ${id.slice(0, 8)}`,
    peso_base: opts.peso ?? 1,
    estoque_inicial: opts.estoque ?? 100,
    estoque_atual: opts.estoque ?? 100,
    ordem_roleta: opts.ordem ?? 1,
    e_premio_real: opts.real ?? true,
    cor_hex: '#4afad4',
  });
  if (error) throw new Error(`criarPremioTest: ${error.message}`);
  return id;
}

export async function criarSessaoTest(
  eventoId: string,
  operadorId: string,
  status: string = 'aguardando_celular',
  premioParaFinalizada?: string
): Promise<string> {
  const id = randomUUID();
  const precisaDados = ['pronta_para_girar', 'girando', 'finalizada'].includes(status);
  const dadosExtras = precisaDados
    ? {
        jogador_nome: 'Teste Fixture',
        jogador_telefone: '54988887' + String(Math.floor(Math.random() * 900) + 100),
        jogador_email: 'fixture@test.local',
        ...(status === 'finalizada' && premioParaFinalizada
            ? { premio_sorteado_id: premioParaFinalizada }
            : {}),
      }
    : {};
  const { error } = await sb.from('sessoes_jogo').insert({
    id,
    evento_id: eventoId,
    jogo: 'roleta',
    status,
    liberada_por: operadorId,
    ...dadosExtras,
  });
  if (error) throw new Error(`criarSessaoTest: ${error.message}`);
  return id;
}

export async function limparEvento(eventoId: string): Promise<void> {
  await sb.from('eventos').delete().eq('id', eventoId);
  // ON DELETE CASCADE limpa premios, sessoes_jogo, ganhadores
}
