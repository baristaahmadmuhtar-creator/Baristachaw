import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';

const routes = ['/', '/chat', '/scanner', '/collection', '/tools'];

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

for (const route of routes) {
  test(`a11y ${route} has no serious/critical violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      severe,
      severe.map((v) => `${v.id}: ${v.help}`).join('\n')
    ).toEqual([]);
  });
}

test('a11y /tools?tab=ai-brew with picker open has no serious/critical violations', async ({ page }) => {
  await mockAiApis(page);
  await page.goto('/tools?tab=ai-brew');
  await page.getByTestId('ai-brew-open-quick').click();
  await page.getByTestId('ai-brew-dripper-picker').click();
  await expect(page.getByRole('dialog', { name: 'Dripper' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((v) =>
    v.impact === 'critical' || v.impact === 'serious'
  );

  expect(
    severe,
    severe.map((v) => `${v.id}: ${v.help}`).join('\n')
  ).toEqual([]);
});

test('a11y /tools?tab=ai-brew with result workspace open has no serious/critical violations', async ({ page }) => {
  await mockAiApis(page);
  await page.goto('/tools?tab=ai-brew');
  await page.getByTestId('ai-brew-open-quick').click();
  await page.getByTestId('ai-brew-coffee-name').fill('A11y Result Brew');
  await page.getByTestId('ai-brew-water-picker').click();
  await page.getByTestId('ai-brew-picker-search-water_brand').fill('volvic');
  await page.getByTestId('ai-brew-picker-option-water_brand-volvic-sg').click();
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((v) =>
    v.impact === 'critical' || v.impact === 'serious'
  );

  expect(
    severe,
    severe.map((v) => `${v.id}: ${v.help}`).join('\n')
  ).toEqual([]);
});
