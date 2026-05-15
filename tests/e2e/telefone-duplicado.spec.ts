import { test, expect, type Browser } from '@playwright/test';
import { loginOperador } from './helpers/login';
import { criarEventoLimpo, limparEvento } from './helpers/fixtures';

let eventoId: string;

test.beforeAll(async () => {
  const r = await criarEventoLimpo();
  eventoId = r.eventoId;
});
test.afterAll(async () => { await limparEvento(eventoId); });

async function pegarUrlDoTotem(totemPage: import('@playwright/test').Page): Promise<string> {
  await totemPage.waitForFunction(
    () => (window as unknown as { __ALTIS_TOTEM_STATE__?: { tipo: string } })
      .__ALTIS_TOTEM_STATE__?.tipo === 'aguardando_celular',
    null,
    { timeout: 15_000 }
  );
  return await totemPage.evaluate(() => {
    const s = (window as unknown as {
      __ALTIS_TOTEM_STATE__?: { sessaoId: string; token: string };
    }).__ALTIS_TOTEM_STATE__!;
    return `${window.location.origin}/jogar?s=${s.sessaoId}&t=${s.token}`;
  });
}

async function jogar(browser: Browser, telefone: string, nome: string, email: string): Promise<void> {
  const ctxTotem = await browser.newContext();
  const totem = await ctxTotem.newPage();
  await loginOperador(totem);
  await totem.goto('/totem-roleta');
  await totem.getByRole('button').first().click();
  const url = await pegarUrlDoTotem(totem);

  const ctxCel = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cel = await ctxCel.newPage();
  await cel.goto(url);
  await cel.getByLabel(/nome/i).fill(nome);
  await cel.getByLabel(/telefone|whatsapp/i).fill(telefone);
  await cel.getByLabel(/e-?mail/i).fill(email);
  const lgpd = cel.getByLabel(/aceito|concordo|LGPD/i);
  if (await lgpd.count()) await lgpd.first().check();
  await cel.getByRole('button', { name: /participar|enviar|girar/i }).click();
  await cel.getByText(/Aguarde/i).waitFor({ timeout: 15_000 });

  await ctxTotem.close();
  await ctxCel.close();
}

async function jogarEsperandoErro(browser: Browser, telefone: string): Promise<string> {
  const ctxTotem = await browser.newContext();
  const totem = await ctxTotem.newPage();
  await loginOperador(totem);
  await totem.goto('/totem-roleta');
  await totem.getByRole('button').first().click();
  const url = await pegarUrlDoTotem(totem);

  const ctxCel = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cel = await ctxCel.newPage();
  await cel.goto(url);
  await cel.getByLabel(/nome/i).fill('Teste 2');
  await cel.getByLabel(/telefone|whatsapp/i).fill(telefone);
  await cel.getByLabel(/e-?mail/i).fill('t2@t.com');
  const lgpd = cel.getByLabel(/aceito|concordo|LGPD/i);
  if (await lgpd.count()) await lgpd.first().check();
  await cel.getByRole('button', { name: /participar|enviar|girar/i }).click();

  const erro = await cel.getByText(/telefone|j.\s*jogou|j.\s*participou|j..apostou/i)
    .first()
    .textContent({ timeout: 15_000 });
  await ctxTotem.close();
  await ctxCel.close();
  return erro ?? '';
}

test('mesmo telefone tentando jogar 2x retorna erro amigavel', async ({ browser }) => {
  await jogar(browser, '54988880001', 'Teste 1', 't1@t.com');
  const erro = await jogarEsperandoErro(browser, '54988880001');
  expect(erro).toMatch(/telefone|j.\s*jogou|j.\s*participou|j..apostou/i);
});
