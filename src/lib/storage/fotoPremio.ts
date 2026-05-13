import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Devolve a URL publica (bucket `fotos_premios` e publico) de uma foto
 * de premio. Retorna null se path nao foi informado.
 */
export function urlFotoPremio(fotoPath: string | null | undefined): string | null {
  if (!fotoPath) return null;
  const sb = getSupabaseBrowserClient();
  const { data } = sb.storage.from('fotos_premios').getPublicUrl(fotoPath);
  return data.publicUrl ?? null;
}
