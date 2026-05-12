import { randomBytes } from 'node:crypto';

/** Gera um segredo aleatório base64url (URL-safe), suficiente para HS256. */
export function gerarSegredo(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}
