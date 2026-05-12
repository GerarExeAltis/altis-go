import type { Page } from '@playwright/test';
import { clearAuditoriaAdminLogin } from './fixtures';

export async function destravarAdmin(page: Page, senha = 'admin123'): Promise<void> {
  await clearAuditoriaAdminLogin();
  await page.getByRole('button', { name: /^admin$/i }).click();
  await page.getByLabel(/senha/i).fill(senha);
  await page.getByRole('button', { name: /desbloquear/i }).click();
  await page.getByText(/Admin \d{2}:\d{2}/).waitFor({ timeout: 10_000 });
}
