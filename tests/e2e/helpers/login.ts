import type { Page } from '@playwright/test';

export const SEED_OPERADOR = {
  email: 'dev@altis.local',
  senha: 'senha123',
};

export async function loginOperador(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(SEED_OPERADOR.email);
  await page.getByLabel(/senha/i).fill(SEED_OPERADOR.senha);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL('**/', { timeout: 15_000 });
}
