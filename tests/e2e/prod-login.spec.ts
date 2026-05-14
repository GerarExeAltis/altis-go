import { test, expect } from '@playwright/test';

const PROD = 'https://gerarexealtis.github.io/altis-go';

test.describe('produção — tela de login', () => {
  test('login limpo: logo + título "AltisGo" + sem erro', async ({ page }) => {
    await page.goto(`${PROD}/login/`);
    await expect(page.getByRole('heading', { name: 'AltisGo' })).toBeVisible();
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
    await expect(page.getByText('Credenciais inválidas.')).toHaveCount(0);
    // logo (mask-image) tem aria-label
    await expect(page.getByRole('img', { name: /altis sistemas/i })).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/prod-login.png', fullPage: false });
  });

  test('login com ?erro=credenciais mostra mensagem genérica', async ({ page }) => {
    await page.goto(`${PROD}/login/?erro=credenciais`);
    await expect(page.getByText('Credenciais inválidas.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/perfil/i)).toHaveCount(0);
    await expect(page.getByText(/inativo/i)).toHaveCount(0);
    await expect(page.getByText(/acesso negado/i)).toHaveCount(0);
    await page.screenshot({ path: 'tests/e2e/screenshots/prod-login-erro.png', fullPage: false });
  });

  test('assets carregam (logo.svg e altis-animacao.gif respondem 200)', async ({ page }) => {
    const r1 = await page.request.get(`${PROD}/logo.svg`);
    expect(r1.status()).toBe(200);
    const r2 = await page.request.get(`${PROD}/altis-animacao.gif`);
    expect(r2.status()).toBe(200);
  });
});
