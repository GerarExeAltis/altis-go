import { config } from 'dotenv';
import { resetAdminClient, getAdminClient } from '../../src/lib/supabase-admin.js';

let loaded = false;
export function loadTestEnv(): void {
  if (loaded) return;
  config({ path: '.env.test' });
  loaded = true;
  resetAdminClient();
}

export async function senhaAdminAtualOk(senha: string): Promise<boolean> {
  const sb = getAdminClient();
  const { data, error } = await sb.schema('private')
    .rpc('verificar_senha_admin', { p_senha: senha });
  if (error) throw new Error(error.message);
  return data === true;
}
