'use client';
import * as React from 'react';
import { useAuth } from './AuthContext';

interface AdminState {
  adminJwt: string | null;
  expiraEm: number | null;
  modoAdmin: boolean;
  ativar: (jwt: string, exp: number) => void;
  desativar: () => void;
  segundosRestantes: number;
}

const AdminCtx = React.createContext<AdminState | null>(null);

// Chave em sessionStorage — vinculamos ao user.id para nao reaproveitar
// JWT-Admin de uma sessao anterior quando trocamos de operador logado.
const STORAGE_KEY = 'altisbet.admin.session.v1';

interface StoredAdmin {
  jwt: string;
  exp: number;
  uid: string;
}

function readStored(uid: string | null): StoredAdmin | null {
  if (typeof window === 'undefined' || !uid) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdmin;
    // Invalida se for de outro user OU se ja expirou
    if (parsed.uid !== uid) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(s: StoredAdmin | null): void {
  if (typeof window === 'undefined') return;
  if (s === null) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [adminJwt, setJwt] = React.useState<string | null>(null);
  const [expiraEm, setExp] = React.useState<number | null>(null);
  const [agora, setAgora] = React.useState<number>(() => Math.floor(Date.now() / 1000));

  // Hidrata do sessionStorage quando o user logado muda (inclusive carregamento inicial).
  React.useEffect(() => {
    const stored = readStored(uid);
    if (stored) {
      setJwt(stored.jwt);
      setExp(stored.exp);
    } else {
      // Sem registro valido pra este user (ou nao tem user): zera tudo
      // e remove storage. Cobre o caso "deslogou e logou de novo".
      setJwt(null);
      setExp(null);
      writeStored(null);
    }
  }, [uid]);

  React.useEffect(() => {
    if (!expiraEm) return;
    const id = setInterval(() => setAgora(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [expiraEm]);

  React.useEffect(() => {
    if (expiraEm && agora >= expiraEm) {
      setJwt(null);
      setExp(null);
      writeStored(null);
    }
  }, [agora, expiraEm]);

  const ativar = React.useCallback((jwt: string, exp: number) => {
    if (!uid) return;
    setJwt(jwt);
    setExp(exp);
    writeStored({ jwt, exp, uid });
  }, [uid]);

  const desativar = React.useCallback(() => {
    setJwt(null);
    setExp(null);
    writeStored(null);
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
