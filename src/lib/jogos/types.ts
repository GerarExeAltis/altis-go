import type { ComponentType } from 'react';
import type { PremioDb } from '@/lib/admin/types';

/** Id de cada jogo — bate com o ENUM `jogo_tipo` no Postgres. */
export type JogoId = 'roleta' | 'dados';

export type JogoStatus = 'ativo' | 'em-breve' | 'manutencao';

/**
 * Props recebidas por qualquer componente de preview de jogo.
 * Cada jogo recebe os prêmios cadastrados para o evento ativo
 * e pode usar ou ignorar conforme sua mecânica.
 */
export interface PreviewJogoProps {
  premios: PremioDb[];
}

/** Manifesto de um jogo no catálogo. */
export interface JogoDef {
  /** Id estável usado no banco (jogo_tipo) e em URLs. */
  id: JogoId;
  /** Nome exibido na home / preview. */
  nome: string;
  /** Frase curta abaixo do nome. */
  subtitulo: string;
  /** Emoji decorativo (poderia ser <LucideIcon /> também). */
  icone: string;
  /** Rota do totem desse jogo. */
  hrefTotem: string;
  /** Disponibilidade para o jogador. */
  status: JogoStatus;
  /** Rótulo opcional do badge — útil para 'em breve' / 'manutenção'. */
  badge?: string;
  /**
   * Componente de preview administrativo (carregado lazy).
   * Recebe os prêmios cadastrados e simula a mecânica do jogo
   * sem afetar dados reais.
   * `null` para jogos sem preview implementado ainda.
   */
  Preview: ComponentType<PreviewJogoProps> | null;
}
