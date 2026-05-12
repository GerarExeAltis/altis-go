import { password } from '@inquirer/prompts';
import { loadEnv } from '../lib/env.js';
import { getAdminClient } from '../lib/supabase-admin.js';
import { log } from '../lib/logger.js';

export interface DefinirSenhaAdminOpts {
  senha?: string;
  envFile?: string;
}

export async function definirSenhaAdmin(opts: DefinirSenhaAdminOpts): Promise<void> {
  // Em testes a env já foi carregada via .env.test; só carrega se envFile foi explicitamente passado.
  if (opts.envFile) loadEnv(opts);

  let senha = opts.senha;
  if (!senha) {
    senha = await password({
      message: 'Nova senha do modo admin (mínimo 8 chars):',
      mask: '*',
      validate: (v) => (v.length >= 8 ? true : 'mínimo 8 caracteres'),
    });
    const conf = await password({
      message: 'Confirme a senha:',
      mask: '*',
    });
    if (conf !== senha) throw new Error('Senhas não conferem');
  }

  if (senha.length < 8) {
    throw new Error('Senha precisa de ao menos 8 caracteres');
  }

  const sb = getAdminClient();
  const { error } = await sb.schema('private')
    .rpc('definir_senha_admin', { p_senha: senha });
  if (error) {
    throw new Error(`definir_senha_admin RPC falhou: ${error.message}`);
  }

  log.ok('Senha admin atualizada com bcrypt cost 12.');
}
