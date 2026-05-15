import { test, expect, type Browser, type Page } from '@playwright/test';
import { criarEventoLimpo, limparEvento, clearAuditoriaAdminLogin } from './helpers/fixtures';
import { loginOperador } from './helpers/login';

let eventoId: string;

test.beforeAll(async () => {
  await clearAuditoriaAdminLogin();
  const r = await criarEventoLimpo();
  eventoId = r.eventoId;
});

test.afterAll(async () => {
  await limparEvento(eventoId);
});

async function pegarUrlDoTotem(totem: Page): Promise<string> {
  await totem.waitForFunction(
    () => {
      const s = (window as unknown as { __ALTIS_TOTEM_STATE__?: { tipo: string } }).__ALTIS_TOTEM_STATE__;
      return !!s && s.tipo === 'aguardando_celular';
    },
    null,
    { timeout: 15_000 }
  );

  return await totem.evaluate(() => {
    const s = (window as unknown as {
      __ALTIS_TOTEM_STATE__?: { tipo: string; sessaoId: string; token: string };
    }).__ALTIS_TOTEM_STATE__;
    if (!s || s.tipo !== 'aguardando_celular') throw new Error('totem nao em aguardando_celular');
    return `${window.location.origin}/jogar?s=${s.sessaoId}&t=${s.token}`;
  });
}

test('happy path: totem + celular dual context', async ({ browser }: { browser: Browser }) => {
  // === TOTEM ===
  const ctxTotem = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const totem = await ctxTotem.newPage();
  await loginOperador(totem);

  await totem.goto('/totem/roleta');
  await expect(totem.getByText(/TOQUE PARA PARTICIPAR/i)).toBeVisible({ timeout: 15_000 });
  await totem.getByRole('button').first().click();

  const url = await pegarUrlDoTotem(totem);
  expect(url).toMatch(/\/jogar\?s=.+&t=.+/);

  // === CELULAR ===
  const ctxCelular = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const celular = await ctxCelular.newPage();
  await celular.goto(url);

  await expect(celular.getByText(/Roleta de Pr.mios|ROLETA DE PR.MIOS/i)).toBeVisible({ timeout: 15_000 });

  await celular.getByLabel(/nome/i).fill('Maria E2E');
  await celular.getByLabel(/telefone|whatsapp/i).fill('54988887777');
  await celular.getByLabel(/e-?mail/i).fill('maria@e2e.local');
  const lgpd = celular.getByLabel(/aceito|concordo|LGPD/i);
  if (await lgpd.count()) await lgpd.first().check();
  await celular.getByRole('button', { name: /participar|enviar|girar/i }).click();

  await expect(celular.getByText(/Aguarde, Maria/i)).toBeVisible({ timeout: 15_000 });

  // === TOTEM anima e finaliza ===
  await expect(totem.getByText(/Boa sorte, Maria/i)).toBeVisible({ timeout: 20_000 });
  await expect(totem.getByText(/Parab.ns, Maria/i)).toBeVisible({ timeout: 20_000 });
  await expect(totem.getByText('Vale R$10 E2E')).toBeVisible();

  // === CELULAR — Realtime resultado ===
  await expect(celular.getByText(/Parab.ns|GANHOU/i)).toBeVisible({ timeout: 15_000 });
  await expect(celular.getByText('Vale R$10 E2E')).toBeVisible();

  await ctxTotem.close();
  await ctxCelular.close();
});
