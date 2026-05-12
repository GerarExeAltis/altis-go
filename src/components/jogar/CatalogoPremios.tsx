'use client';
import type { PremioPublico } from '@/lib/jogar/types';

export function CatalogoPremios({ premios }: { premios: PremioPublico[] }) {
  const reais = premios.filter((p) => p.e_premio_real);
  if (reais.length === 0) return null;

  return (
    <details className="rounded-lg border bg-card p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Ver prêmios disponíveis ({reais.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {reais.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded"
              style={{ backgroundColor: p.cor_hex ?? '#cccccc' }}
              aria-hidden
            />
            <span>{p.nome}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
