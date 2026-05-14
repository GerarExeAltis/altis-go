// Tipos do dominio compartilhados entre Edge Functions.

export type JogoTipo = 'roleta' | 'dados';

export type SessaoStatus =
  | 'aguardando_celular'
  | 'aguardando_dados'
  | 'pronta_para_girar'
  | 'girando'
  | 'finalizada'
  | 'expirada'
  | 'cancelada';

export interface JwtSessaoPayload {
  s: string;       // sessao_id
  e: string;       // evento_id
  g: JogoTipo;     // jogo
  iat: number;
  exp: number;
  nonce: string;
}

export interface JwtAdminPayload {
  sub: string;
  role: 'authenticated';
  aud: 'authenticated';
  iat: number;
  exp: number;
  admin_elevado: true;
  jti: string;
}

export interface DadosJogador {
  nome: string;
  telefone: string;
  email: string;
  empresa?: string | null;
}

export interface PremioPublico {
  id: string;
  nome: string;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
}
