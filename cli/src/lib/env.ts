import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';

export interface EnvOpts {
  envFile?: string;
}

export function loadEnv(opts: EnvOpts = {}): void {
  const path = opts.envFile ?? '.env.local';
  if (!existsSync(path)) {
    throw new Error(`Arquivo de env não encontrado: ${path} (use --env-file)`);
  }
  loadDotenv({ path, override: false });
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return v;
}
