import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadTestEnv } from './helpers/fixtures.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { migrate } from '../src/commands/migrate.js';

beforeEach(() => {
  loadTestEnv();
  vi.clearAllMocks();
});

function fakeSpawn(stdout: string, exit = 0) {
  return {
    stdout: { on: (e: string, cb: (b: Buffer) => void) => e === 'data' && cb(Buffer.from(stdout)) },
    stderr: { on: () => {} },
    on:     (e: string, cb: (n: number) => void) => e === 'close' && cb(exit),
  };
}

describe('cli: migrate', () => {
  it('migrate up invoca `supabase db push`', async () => {
    (spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeSpawn(''));
    await migrate('up', {});
    const call = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('supabase');
    expect(call[1]).toEqual(['db', 'push']);
  });

  it('migrate status invoca `supabase migration list`', async () => {
    (spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeSpawn('20260511 init_schema\n')
    );
    await migrate('status', {});
    const call = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('supabase');
    expect(call[1]).toEqual(['migration', 'list']);
  });

  it('action inválida lança erro', async () => {
    await expect(migrate('foo', {})).rejects.toThrow(/up.*status/i);
  });

  it('exit code não-zero propaga erro', async () => {
    (spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeSpawn('boom', 1));
    await expect(migrate('up', {})).rejects.toThrow(/falhou.*1/i);
  });
});
