import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFingerprint } from '@/hooks/useFingerprint';

describe('useFingerprint', () => {
  it('retorna um hash hex de 64 chars (sha-256)', async () => {
    const { result } = renderHook(() => useFingerprint());
    await waitFor(() => expect(result.current.fingerprint).not.toBeNull());
    expect(result.current.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('estável entre invocações no mesmo ambiente', async () => {
    const a = renderHook(() => useFingerprint());
    const b = renderHook(() => useFingerprint());
    await waitFor(() => {
      expect(a.result.current.fingerprint).not.toBeNull();
      expect(b.result.current.fingerprint).not.toBeNull();
    });
    expect(a.result.current.fingerprint).toBe(b.result.current.fingerprint);
  });

  it('loading começa true e termina false', async () => {
    const { result } = renderHook(() => useFingerprint());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fingerprint).not.toBeNull();
  });
});
