import { expect, test, type Page } from '@playwright/test';
import {
  buildLiveAuditRecipeMatrix,
  buildLiveAuditUnsupportedIcedChecks,
  type LiveAuditBean,
  type LiveAuditEquipmentCase,
  type LiveAuditRecipeCase,
} from '../helpers/aiBrewLiveAuditMatrix';

const liveBaseUrl = (process.env.LIVE_AI_BREW_BASE_URL || 'https://baristaclaw.vercel.app').replace(/\/$/, '');
const liveEmail = process.env.LIVE_AI_BREW_EMAIL?.trim();
const livePassword = process.env.LIVE_AI_BREW_PASSWORD?.trim();
const shouldCleanup = String(process.env.LIVE_AI_BREW_CLEANUP || '').trim() === '1';
const liveLimit = Math.max(100, Number.parseInt(process.env.LIVE_AI_BREW_LIMIT || '180', 10) || 180);
const liveEnabled = Boolean(liveEmail && livePassword);

test.skip(!liveEnabled, 'Set LIVE_AI_BREW_EMAIL and LIVE_AI_BREW_PASSWORD to run the live AI Brew 100+ recipe audit.');
test.setTimeout(3_600_000);

function liveUrl(path: string) {
  return `${liveBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function setVisibleInputValue(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId);
  await expect(input).toBeVisible();
  await page.evaluate(({ nextTestId, nextValue }) => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      `[data-testid="${nextTestId}"]`,
    )).find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error(`Missing visible field: ${nextTestId}`);
    const prototype = field instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (!descriptor?.set) throw new Error(`Missing input setter: ${nextTestId}`);
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, '');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    descriptor.set.call(field, nextValue);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  }, { nextTestId: testId, nextValue: value });
  await expect(input).toHaveValue(value);
}

async function loginWithLiveAccount(page: Page) {
  await page.goto(liveUrl('/masuk?lang=id'), { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Masuk ke Baristachaw|Sign in to Baristachaw/i })).toBeVisible();
  await page.getByLabel(/Alamat email|Email address/i).fill(liveEmail!);
  await page.getByRole('button', { name: /Lanjut dengan email|Continue with email/i }).click();

  const passwordInput = page.locator('#auth-route-password');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeFocused();
  await passwordInput.fill(livePassword!);
  await page.getByRole('button', { name: /^Masuk$|^Sign in$/i }).click();
  await expect(passwordInput).toHaveCount(0, { timeout: 45_000 });
}

async function openProAiBrew(page: Page) {
  await page.goto(liveUrl('/tools?tab=ai-brew&lang=id'), { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('ai-brew-open-pro').click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible();
}

async function openProSection(page: Page, section: 'recipe' | 'bean' | 'water' | 'grinder' | 'method' | 'confidence') {
  const trigger = page.getByTestId(`ai-brew-pro-accordion-trigger-${section}`);
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(page.getByTestId(`ai-brew-pro-accordion-panel-${section}`)).toBeVisible();
}

async function selectDripper(page: Page, equipment: LiveAuditEquipmentCase) {
  await openProSection(page, 'method');
  await page.getByTestId('ai-brew-dripper-picker').click();
  await expect(page.getByTestId('ai-brew-picker-search-dripper')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-picker-search-dripper', equipment.query);
  const preferred = page.getByTestId(`ai-brew-picker-option-dripper-${equipment.id}`);
  if (await preferred.count()) {
    await preferred.first().click();
  } else {
    await page.locator('[data-testid^="ai-brew-picker-option-dripper-"]').first().click();
  }

  if (equipment.id === 'aeropress' && equipment.aeropressStyle && equipment.aeropressStyle !== 'auto') {
    await openProSection(page, 'method');
    await page.getByTestId(`ai-brew-aeropress-style-${equipment.aeropressStyle}`).click();
    await expect(page.getByTestId(`ai-brew-aeropress-style-${equipment.aeropressStyle}`)).toHaveAttribute('aria-pressed', 'true');
  }
}

async function selectCatalogOrCustom(
  page: Page,
  kind: 'process' | 'variety',
  query: string,
  preferredId: string | undefined,
) {
  await page.getByTestId(`ai-brew-${kind}-picker`).click();
  await expect(page.getByTestId(`ai-brew-picker-search-${kind}`)).toBeVisible();
  await setVisibleInputValue(page, `ai-brew-picker-search-${kind}`, query);

  const preferred = preferredId ? page.getByTestId(`ai-brew-picker-option-${kind}-${preferredId}`) : null;
  if (preferred && await preferred.count()) {
    await preferred.first().click();
    return;
  }

  const firstCatalogMatch = page.locator(`[data-testid^="ai-brew-picker-option-${kind}-"]`).first();
  if (await firstCatalogMatch.count()) {
    await firstCatalogMatch.click();
    return;
  }

  await page.getByRole('button', { name: kind === 'process'
    ? /Select custom process|Pilih proses manual|Pilih proses kustom/i
    : /Select custom variety|Pilih varietas manual|Pilih varietas kustom/i,
  }).click();
  await setVisibleInputValue(page, kind === 'process' ? 'ai-brew-process-custom' : 'ai-brew-variety-custom', query);
}

async function fillBeanProfile(page: Page, bean: LiveAuditBean) {
  await openProSection(page, 'bean');
  await selectCatalogOrCustom(page, 'process', bean.process, bean.processId);
  await selectCatalogOrCustom(page, 'variety', bean.variety, bean.varietyId);

  if (bean.altitudeMasl || bean.beanDensityGml || bean.roastDevelopment || bean.solubility) {
    const toggle = page.getByTestId('ai-brew-bean-profile-toggle');
    await expect(toggle).toBeVisible();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
    if (bean.altitudeMasl) await setVisibleInputValue(page, 'ai-brew-bean-altitude', bean.altitudeMasl);
    if (bean.beanDensityGml) await setVisibleInputValue(page, 'ai-brew-bean-density', bean.beanDensityGml);
    if (bean.roastDevelopment) await page.getByTestId(`ai-brew-bean-roast-${bean.roastDevelopment}`).click();
    if (bean.solubility) await page.getByTestId(`ai-brew-bean-solubility-${bean.solubility}`).click();
  }
}

async function setManualWater(page: Page) {
  await openProSection(page, 'water');
  await page.getByTestId('ai-brew-water-mode-manual').click();
  await setVisibleInputValue(page, 'ai-brew-water-tds', '90');
  await setVisibleInputValue(page, 'ai-brew-water-hardness', '55');
  await setVisibleInputValue(page, 'ai-brew-water-alkalinity', '35');
}

async function generateAndSaveRecipe(page: Page, recipe: LiveAuditRecipeCase) {
  await openProAiBrew(page);
  await openProSection(page, 'recipe');
  await (recipe.brewMode === 'iced'
    ? page.getByTestId('ai-brew-builder-mode-iced')
    : page.getByTestId('ai-brew-builder-mode-hot')).click();

  await setVisibleInputValue(page, 'ai-brew-coffee-name', recipe.title);
  await setVisibleInputValue(page, 'ai-brew-dose', '15');
  await page.getByTestId(`ai-brew-roast-${recipe.bean.roastLevel}`).click();
  await page.getByTestId(`ai-brew-target-profile-${recipe.targetProfileId}`).click();
  await selectDripper(page, recipe.equipment);
  await fillBeanProfile(page, recipe.bean);
  await setManualWater(page);

  await page.getByTestId('ai-brew-generate').click();
  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible({ timeout: 45_000 });
  await expect(result).toContainText(recipe.title);
  await expect(result.getByTestId('ai-brew-bean-data-precision')).toBeVisible();
  await result.getByTestId('ai-brew-result-tab-details').click();
  await expect(result.getByTestId('ai-brew-why-this-extraction')).toBeVisible();
  await expect(result.getByTestId('ai-brew-bean-data-precision-signals')).toContainText(/process|proses|roast|water|TDS/i);
  if (recipe.brewMode === 'iced') {
    await expect(result).toContainText(/ice|es|hot concentrate|konsentrat|air panas/i);
  }

  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await result.getByTestId('ai-brew-save').click();
  await expect(result.getByTestId('ai-brew-save-success')).toBeVisible({ timeout: 30_000 });
  return recipe.title;
}

async function verifySavedRecipe(page: Page, title: string) {
  await page.goto(liveUrl('/collection?lang=id'), { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Collection|Koleksi/i })).toBeVisible({ timeout: 45_000 });
  const search = page.locator('input[name="collection-search"]').first();
  await expect(search).toBeVisible();
  await search.fill(title);
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
}

async function cleanupSavedRecipe(page: Page, title: string) {
  await page.goto(liveUrl('/collection?lang=id'), { waitUntil: 'domcontentloaded' });
  const search = page.locator('input[name="collection-search"]').first();
  await expect(search).toBeVisible();
  await search.fill(title);
  const deleteButton = page.getByRole('button', { name: new RegExp(`^(Delete|Hapus)\\s+${escapeRegExp(title)}$`, 'i') }).first();
  if (!(await deleteButton.count())) return;
  await deleteButton.click();
  const dialog = page.getByRole('dialog', { name: /Delete item|Hapus item|Delete recipe|Hapus resep/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^Delete$|^Hapus$/i }).click();
  await expect(dialog).toBeHidden();
}

async function verifyUnsupportedIcedLocks(page: Page) {
  for (const equipment of buildLiveAuditUnsupportedIcedChecks()) {
    await openProAiBrew(page);
    await selectDripper(page, equipment);
    await expect(page.getByTestId('ai-brew-builder-mode-iced')).toBeDisabled();
  }
}

test('live real-account AI Brew 100+ matrix saves recipes and verifies Collection items', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('BARISTA_LANGUAGE', 'id');
    localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
  });

  await loginWithLiveAccount(page);

  const savedTitles: string[] = [];
  for (const recipe of buildLiveAuditRecipeMatrix(liveLimit)) {
    const title = await generateAndSaveRecipe(page, recipe);
    savedTitles.push(title);
  }

  for (const title of savedTitles) {
    await verifySavedRecipe(page, title);
  }

  await verifyUnsupportedIcedLocks(page);

  if (shouldCleanup) {
    for (const title of savedTitles) {
      await cleanupSavedRecipe(page, title);
    }
  }
});
