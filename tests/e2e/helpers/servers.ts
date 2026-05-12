import { execSync, spawn, ChildProcess } from 'node:child_process';

interface ServerHandle {
  proc: ChildProcess;
  name: string;
}

const handles: ServerHandle[] = [];

export async function startFunctionsServe(): Promise<void> {
  console.log('[e2e] starting supabase functions serve...');
  const proc = spawn(
    'supabase',
    ['functions', 'serve', '--no-verify-jwt', '--env-file', 'supabase/.env.local'],
    { stdio: ['ignore', 'pipe', 'pipe'], detached: false, shell: true }
  );
  handles.push({ proc, name: 'functions' });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('functions serve timeout 60s')), 60_000);
    proc.stdout?.on('data', (b: Buffer) => {
      if (b.toString().includes('Serving functions')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('exit', (code) => reject(new Error(`functions serve exited ${code}`)));
  });
}

export async function startNextDev(): Promise<void> {
  console.log('[e2e] starting next dev...');
  const proc = spawn('npm', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  handles.push({ proc, name: 'next' });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('next dev timeout 90s')), 90_000);
    proc.stdout?.on('data', (b: Buffer) => {
      const s = b.toString();
      if (s.includes('Ready in') || s.includes('localhost:3000')) {
        clearTimeout(timer);
        setTimeout(resolve, 1500);
      }
    });
  });
}

export function stopAll(): void {
  for (const h of handles) {
    try {
      h.proc.kill('SIGTERM');
    } catch (e) {
      console.error(`[e2e] falha ao matar ${h.name}:`, e);
    }
  }
  handles.length = 0;
}

export function resetSupabaseDb(): void {
  console.log('[e2e] supabase db reset...');
  execSync('supabase db reset', { stdio: 'inherit' });
}
