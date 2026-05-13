export type EventoStatus = 'rascunho' | 'ativo' | 'pausado' | 'encerrado';

export interface EventoDb {
  id: string;
  nome: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  status: EventoStatus;
  criado_por: string;
  criado_em: string;
}

export interface PremioDb {
  id: string;
  evento_id: string;
  nome: string;
  descricao: string | null;
  foto_path: string | null;
  peso_base: number;
  estoque_inicial: number;
  estoque_atual: number;
  ordem_roleta: number;
  e_premio_real: boolean;
}

export interface PerfilOperador {
  id: string;
  nome_completo: string;
  ativo: boolean;
  criado_em: string;
  email?: string;
}

export interface GanhadorDb {
  id: string;
  sessao_id: string;
  evento_id: string;
  premio_id: string;
  jogador_nome: string;
  jogador_telefone: string;
  jogador_email: string;
  jogador_loja_id: string | null;
  ganho_em: string;
  entregue: boolean;
  entregue_em: string | null;
  entregue_por: string | null;
  observacoes: string | null;
}

export interface AuditoriaDb {
  id: number;
  evento_id: string | null;
  acao: string;
  ator: string | null;
  recurso_tipo: string | null;
  recurso_id: string | null;
  detalhes: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  criado_em: string;
}

export interface LojaDb {
  id: string;
  nome: string;
  cidade: string | null;
  ativa: boolean;
}

export interface FingerprintBloqueadoDb {
  fingerprint: string;
  motivo: string;
  bloqueado_em: string;
  bloqueado_por: string | null;
}
