import { spawn } from 'node:child_process';
import { log } from '../lib/logger.js';
import type { EnvOpts } from '../lib/env.js';

const VALID = ['up', 'status'] as const;
type Action = (typeof VALID)[number];

export async function migrate(action: string, _opts: EnvOpts): Promise<void> {
  if (!VALID.includes(action as Action)) {
    throw new Error(`Action inválida '${action}'. Use 'up' ou 'status'.`);
  }
  const args = action === 'up' ? ['db', 'push'] : ['migration', 'list'];
  log.step(`$ supabase ${args.join(' ')}`);
  await rodarSupabase(args);
  log.ok(`migrate ${action} concluído.`);
}

function rodarSupabase(args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('supabase', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.on('data', (b: Buffer) => process.stdout.write(b));
    child.stderr?.on('data', (b: Buffer) => process.stderr.write(b));
    child.on('close', (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`supabase ${args.join(' ')} falhou com exit code ${code}`));
    });
    child.on('error', reject);
  });
}
