import { test, expect } from '@playwright/test';
import { loginOperador, SEED_OPERADOR } from './helpers/login';

test('login com credencial errada exibe mensagem amigavel', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(SEED_OPERADOR.email);
  await page.getByLabel(/senha/i).fill('senha-errada-999');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByText(/credenciais inv.lidas|invalid login/i)).toBeVisible({ timeout: 10_000 });
});

test('login valido leva ao welcome page', async ({ page }) => {
  await loginOperador(page);
  await expect(page.getByText(/Bem-vindo|ROLETA DE PR.MIOS/i)).toBeVisible({ timeout: 10_000 });
});

test('rotas protegidas redirecionam para /login quando deslogado', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/totem-roleta');
  await page.waitForURL('**/login*', { timeout: 10_000 });
  expect(page.url()).toContain('/login');
});

test('logout volta para /login', async ({ page }) => {
  await loginOperador(page);
  await page.getByRole('button', { name: /sair|logout/i }).click();
  await page.waitForURL('**/login*', { timeout: 10_000 });
});
