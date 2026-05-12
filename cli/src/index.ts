import { Command } from 'commander';
import { log } from './lib/logger.js';

const program = new Command();

program
  .name('altis-bet')
  .description('CLI do projeto Altis Bet — setup, migrations, senha admin, import e backup')
  .version('0.3.0')
  .option('-e, --env-file <path>', 'arquivo de variáveis de ambiente', '.env.local');

program
  .command('migrate <action>')
  .description("aplica ou lista migrations. <action> = 'up' | 'status'")
  .action(async (action: string) => {
    const { migrate } = await import('./commands/migrate.js');
    await migrate(action, program.opts());
  });

program
  .command('definir-senha-admin')
  .description('grava nova senha do modo admin (bcrypt server-side)')
  .option('--senha <senha>', 'senha sem prompt interativo (uso em CI)')
  .action(async (opts) => {
    const { definirSenhaAdmin } = await import('./commands/definir-senha-admin.js');
    await definirSenhaAdmin({ ...program.opts(), ...opts });
  });

program
  .command('import-premios <arquivo>')
  .description('importa prêmios de um CSV para o evento ativo')
  .action(async (arquivo: string) => {
    const { importPremios } = await import('./commands/import-premios.js');
    await importPremios(arquivo, program.opts());
  });

program
  .command('backup')
  .description('exporta JSON read-only com eventos, prêmios, ganhadores, auditoria')
  .option('--saida <pasta>', 'pasta de destino', './backups')
  .action(async (opts) => {
    const { backup } = await import('./commands/backup.js');
    await backup({ ...program.opts(), ...opts });
  });

program
  .command('bootstrap')
  .description('setup interativo: gera .env.local, aplica migrations, define senha admin')
  .option('--non-interactive', 'usa flags para todos os campos (uso em CI)')
  .option('--supabase-url <url>')
  .option('--supabase-service-role-key <key>')
  .option('--senha-admin <senha>')
  .option('--force', 'sobrescreve .env.local existente')
  .action(async (opts) => {
    const { bootstrap } = await import('./commands/bootstrap.js');
    await bootstrap({ ...program.opts(), ...opts });
  });

program.parseAsync(process.argv).catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
