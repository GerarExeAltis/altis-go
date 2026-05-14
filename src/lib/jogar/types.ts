export interface PremioPublico {
  id: string;
  nome: string;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
}

export interface ObterSessaoResp {
  sessao: { id: string; jogo: 'roleta' | 'dados'; expira_em: string };
  premios: PremioPublico[];
}

export interface SubmeterDadosResp {
  ok: boolean;
  mensagem: string;
}
