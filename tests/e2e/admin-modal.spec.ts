import { test, expect } from '@playwright/test';
import { loginOperador } from './helpers/login';
import { destravarAdmin } from './helpers/admin';
import { clearAuditoriaAdminLogin } from './helpers/fixtures';

test.beforeEach(async () => {
  await clearAuditoriaAdminLogin();
});

test('senha admin errada exibe mensagem generica', async ({ page }) => {
  await loginOperador(page);
  await page.getByRole('button', { name: /^admin$/i }).click();
  await page.getByLabel(/senha/i).fill('senha-admin-errada');
  await page.getByRole('button', { name: /desbloquear/i }).click();
  await expect(page.getByText(/senha inv.lida|n.o foi poss.vel/i)).toBeVisible({ timeout: 10_000 });
});

test('senha admin correta ativa badge Admin 29:XX', async ({ page }) => {
  await loginOperador(page);
  await destravarAdmin(page, 'admin123');
  await expect(page.getByText(/Admin \d{2}:\d{2}/)).toBeVisible();
});

test('modo admin destravado da acesso ao painel /admin', async ({ page }) => {
  await loginOperador(page);
  await destravarAdmin(page, 'admin123');
  await page.goto('/admin');
  await expect(page.getByText(/Dashboard|Painel/i)).toBeVisible({ timeout: 10_000 });
});
