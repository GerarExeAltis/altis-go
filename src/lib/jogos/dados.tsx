import type { JogoDef } from './types';

/**
 * Placeholder do jogo Dados da Sorte. Quando for implementar:
 *  1. Trocar status para 'ativo'
 *  2. Implementar a tela do totem em src/app/totem-dados/page.tsx
 *  3. Criar Preview component aqui ou em arquivo separado
 *  4. Atualizar hrefTotem para a rota real
 */
export const DADOS_DEF: JogoDef = {
  id: 'dados',
  nome: 'DADOS DA SORTE',
  subtitulo: 'Em breve',
  icone: '🎲',
  hrefTotem: '/totem-dados',
  status: 'em-breve',
  badge: 'em breve',
  Preview: null,
};
