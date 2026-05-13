export type SessaoStatus =
  | 'aguardando_celular'
  | 'aguardando_dados'
  | 'pronta_para_girar'
  | 'girando'
  | 'finalizada'
  | 'expirada'
  | 'cancelada';

export interface PremioDb {
  id: string;
  nome: string;
  foto_path: string | null;
  ordem_roleta: number;
  e_premio_real: boolean;
  estoque_atual: number;
  peso_base: number;
}
