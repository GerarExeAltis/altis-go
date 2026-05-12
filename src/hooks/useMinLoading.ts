'use client';
import * as React from 'react';

/**
 * Mantém o estado de loading verdadeiro por no mínimo `minMs` ms — usado
 * para deixar a animação do <Loading /> completar antes de revelar o
 * conteúdo, evitando flash de 200ms.
 *
 * Retorna `true` se EITHER o loading externo ainda está rodando OU o
 * piso de tempo mínimo ainda não estourou.
 *
 * Exemplo:
 *   const isLoading = useMinLoading(externalLoading, 4000);
 *   if (isLoading) return <Loading />;
 */
export function useMinLoading(externalLoading: boolean, minMs = 4000): boolean {
  const [piso, setPiso] = React.useState(true);

  React.useEffect(() => {
    const id = setTimeout(() => setPiso(false), minMs);
    return () => clearTimeout(id);
  }, [minMs]);

  return externalLoading || piso;
}
