'use client';
import * as React from 'react';

interface AdminState {
  adminJwt: string | null;
  expiraEm: number | null;
  modoAdmin: boolean;
  ativar: (jwt: string, exp: number) => void;
  desativar: () => void;
  segundosRestantes: number;
}

const AdminCtx = React.createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminJwt, setJwt] = React.useState<string | null>(null);
  const [expiraEm, setExp] = React.useState<number | null>(null);
  const [agora, setAgora] = React.useState<number>(() => Math.floor(Date.now() / 1000));

  React.useEffect(() => {
    if (!expiraEm) return;
    const id = setInterval(() => setAgora(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [expiraEm]);

  React.useEffect(() => {
    if (expiraEm && agora >= expiraEm) {
      setJwt(null);
      setExp(null);
    }
  }, [agora, expiraEm]);

  const ativar = React.useCallback((jwt: string, exp: number) => {
    setJwt(jwt);
    setExp(exp);
  }, []);
  const desativar = React.useCallback(() => {
    setJwt(null);
    setExp(null);
  }, []);

  const segundosRestantes = expiraEm ? Math.max(0, expiraEm - agora) : 0;
  const modoAdmin = adminJwt !== null && segundosRestantes > 0;

  const value = React.useMemo<AdminState>(
    () => ({ adminJwt, expiraEm, modoAdmin, ativar, desativar, segundosRestantes }),
    [adminJwt, expiraEm, modoAdmin, ativar, desativar, segundosRestantes]
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdmin(): AdminState {
  const v = React.useContext(AdminCtx);
  if (!v) throw new Error('useAdmin deve ser usado dentro de <AdminProvider>');
  return v;
}
