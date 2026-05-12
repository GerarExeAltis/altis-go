import { env } from '@/lib/env';

export async function uploadFotoPremio(
  adminJwt: string,
  premioId: string,
  arquivo: File
): Promise<string> {
  const fd = new FormData();
  fd.append('premio_id', premioId);
  fd.append('arquivo', arquivo);
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/processar-imagem`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminJwt}` },
    body: fd,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.erro ?? `upload falhou: ${res.status}`);
  }
  const { foto_path } = (await res.json()) as { foto_path: string };
  return foto_path;
}
