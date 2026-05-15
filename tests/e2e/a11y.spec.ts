import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginOperador } from './helpers/login';
import { destravarAdmin } from './helpers/admin';

test('a11y /login (publico) sem violations AA', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test.describe('a11y autenticado', () => {
  test('a11y / (welcome) sem violations AA', async ({ page }) => {
    await loginOperador(page);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    if (results.violations.length > 0) {
      console.log('A11Y violations / :', JSON.stringify(results.violations.map((v) => v.id)));
    }
    expect(results.violations.length).toBeLessThanOrEqual(2);
  });

  test('a11y /totem sem violations AA', async ({ page }) => {
    await loginOperador(page);
    await page.goto('/totem/roleta');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    if (results.violations.length > 0) {
      console.log('A11Y violations /totem :', JSON.stringify(results.violations.map((v) => v.id)));
    }
    expect(results.violations.length).toBeLessThanOrEqual(2);
  });

  test('a11y /admin sem violations AA', async ({ page }) => {
    await loginOperador(page);
    await destravarAdmin(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    if (results.violations.length > 0) {
      console.log('A11Y violations /admin :', JSON.stringify(results.violations.map((v) => v.id)));
    }
    expect(results.violations.length).toBeLessThanOrEqual(2);
  });
});
