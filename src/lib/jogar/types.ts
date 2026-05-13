export interface PremioPublico {
  id: string;
  nome: string;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
}

export interface LojaPublica {
  id: string;
  nome: string;
  cidade: string | null;
}

export interface ObterSessaoResp {
  sessao: { id: string; jogo: 'roleta' | 'dados'; expira_em: string };
  premios: PremioPublico[];
  lojas: LojaPublica[];
}

export interface SubmeterDadosResp {
  ok: boolean;
  mensagem: string;
}
