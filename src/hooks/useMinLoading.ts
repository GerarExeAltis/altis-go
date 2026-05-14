'use client';
import * as React from 'react';

/**
 * Duração mínima padrão (em ms) que o <Loading /> deve ficar visível,
 * mesmo que a operação externa termine antes — tempo suficiente para
 * o GIF altis-animacao.gif completar um ciclo da animação.
 *
 * Mude este valor aqui para afetar TODAS as telas que usam useMinLoading
 * sem passar `minMs` explicitamente.
 */
export const LOADING_MIN_MS = 2000;

/**
 * Mantém o estado de loading verdadeiro por no mínimo `minMs` ms — usado
 * para deixar a animação do <Loading /> completar antes de revelar o
 * conteúdo, evitando flash de 200ms.
 *
 * Retorna `true` se EITHER o loading externo ainda está rodando OU o
 * piso de tempo mínimo ainda não estourou.
 *
 * Exemplo (usa default global LOADING_MIN_MS):
 *   const isLoading = useMinLoading(externalLoading);
 *   if (isLoading) return <Loading />;
 *
 * Sobrescrever apenas neste local de uso:
 *   const isLoading = useMinLoading(externalLoading, 2000);
 */
export function useMinLoading(externalLoading: boolean, minMs: number = LOADING_MIN_MS): boolean {
  const [piso, setPiso] = React.useState(true);

  React.useEffect(() => {
    const id = setTimeout(() => setPiso(false), minMs);
    return () => clearTimeout(id);
  }, [minMs]);

  return externalLoading || piso;
}
