import { jsonOk, jsonErr, handlePreflight } from '../_shared/response.ts';
import { errBadRequest, errForbidden, errUnauthorized } from '../_shared/errors.ts';
import { uuidSchema } from '../_shared/validators.ts';
import { jwtVerify } from '../_shared/deps.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_MIME = ['image/png', 'image/jpeg', 'image/webp'];

function getSupabaseJwtSecret(): Uint8Array {
  const s = Deno.env.get('SUPABASE_INTERNAL_JWT_SECRET') ?? Deno.env.get('JWT_AUTH_SECRET');
  if (!s) throw new Error('JWT_AUTH_SECRET ausente');
  return new TextEncoder().encode(s);
}

/** Valida JWT-Admin (modo elevado obrigatório). */
async function exigirAdmin(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw errUnauthorized('Token ausente');
  try {
    const { payload } = await jwtVerify(auth.slice(7), getSupabaseJwtSecret(), {
      algorithms: ['HS256'],
    });
    if (payload.admin_elevado !== true) throw errForbidden('Modo admin necessário');
    return payload.sub as string;
  } catch (e) {
    if ((e as { status?: number }).status) throw e;
    throw errUnauthorized('Token inválido');
  }
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonErr(errBadRequest('Método não permitido'));

  try {
    await exigirAdmin(req);

    const form = await req.formData();
    const premioId = form.get('premio_id');
    const arquivo = form.get('arquivo');

    if (typeof premioId !== 'string' || !uuidSchema.safeParse(premioId).success) {
      throw errBadRequest('premio_id inválido');
    }
    if (!(arquivo instanceof File)) {
      throw errBadRequest('arquivo ausente');
    }
    if (arquivo.size > MAX_BYTES) {
      throw errBadRequest(`Arquivo muito grande (${arquivo.size} bytes; máx ${MAX_BYTES})`);
    }
    if (!ACCEPT_MIME.includes(arquivo.type)) {
      throw errBadRequest(`Tipo não permitido: ${arquivo.type}. Use PNG, JPEG ou WEBP.`);
    }

    const sb = getServiceClient();
    const ext = arquivo.type === 'image/png' ? 'png'
              : arquivo.type === 'image/jpeg' ? 'jpg'
              : 'webp';
    const path = `${premioId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await sb.storage
      .from('fotos_premios')
      .upload(path, arquivo, { contentType: arquivo.type, upsert: false });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    return jsonOk({ foto_path: path });
  } catch (err) {
    return jsonErr(err);
  }
});
