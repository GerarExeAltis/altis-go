import { existsSync, writeFileSync } from 'node:fs';
import { input, password, confirm } from '@inquirer/prompts';
import { log } from '../lib/logger.js';
import { gerarSegredo } from '../lib/secrets.js';
import { migrate } from './migrate.js';
import { definirSenhaAdmin } from './definir-senha-admin.js';

export interface BootstrapOpts {
  envFile?: string;
  nonInteractive?: boolean;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  senhaAdmin?: string;
  force?: boolean;
}

export async function bootstrap(opts: BootstrapOpts): Promise<void> {
  const envPath = opts.envFile ?? '.env.local';

  if (existsSync(envPath) && !opts.force) {
    throw new Error(`${envPath} já existe. Use --force para sobrescrever.`);
  }

  log.title('🎰 Altis Bet — Bootstrap');

  let url: string;
  let serviceKey: string;
  let senha: string;

  if (opts.nonInteractive) {
    if (!opts.supabaseUrl) throw new Error('--non-interactive exige --supabase-url');
    if (!opts.supabaseServiceRoleKey) {
      throw new Error('--non-interactive exige --supabase-service-role-key');
    }
    if (!opts.senhaAdmin) throw new Error('--non-interactive exige --senha-admin');
    url = opts.supabaseUrl;
    serviceKey = opts.supabaseServiceRoleKey;
    senha = opts.senhaAdmin;
  } else {
    log.step('Vamos configurar seu projeto Supabase. Tenha em mãos:');
    log.step('  • SUPABASE_URL (algo como https://xxx.supabase.co)');
    log.step('  • Service Role Key (em Project Settings → API)');
    url = await input({
      message: 'SUPABASE_URL:',
      validate: (v) => v.startsWith('http') || 'URL inválida',
    });
    serviceKey = await password({
      message: 'SUPABASE_SERVICE_ROLE_KEY:',
      mask: '*',
      validate: (v) => v.length > 20 || 'chave muito curta',
    });
    senha = await password({
      message: 'Senha do modo admin (mínimo 8 chars):',
      mask: '*',
      validate: (v) => v.length >= 8 || 'mínimo 8 caracteres',
    });
    const conf = await password({ message: 'Confirme a senha:', mask: '*' });
    if (conf !== senha) throw new Error('Senhas não conferem');

    const ok = await confirm({
      message: `Vou gravar ${envPath} e rodar migrate up. Prosseguir?`,
      default: true,
    });
    if (!ok) { log.warn('Cancelado pelo usuário.'); return; }
  }

  const sessaoSecret = gerarSegredo(48);

  const conteudo = [
    '# Gerado por altis-bet bootstrap',
    `SUPABASE_URL=${url}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    `SESSAO_JWT_SECRET=${sessaoSecret}`,
    '',
  ].join('\n');
  writeFileSync(envPath, conteudo, { encoding: 'utf8', flag: 'w' });
  log.ok(`${envPath} gravado.`);

  // Carrega o env recém-criado no process para os próximos comandos.
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  process.env.SESSAO_JWT_SECRET = sessaoSecret;

  log.step('Aplicando migrations...');
  await migrate('up', { envFile: envPath });

  log.step('Definindo senha admin...');
  await definirSenhaAdmin({ senha });

  log.ok('Bootstrap concluído. 🎉');
  log.info('Próximos passos:');
  log.step('  • supabase status     # ver URLs locais');
  log.step('  • npm run test        # rodar bateria completa de testes');
}
