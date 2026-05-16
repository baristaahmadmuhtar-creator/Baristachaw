import { test, expect } from '@playwright/test';
import { clearClientState } from '../helpers/cleanup';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

const createFolderButton = /Create Folder|Buat Folder/i;

test('mobile main routes render', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/What would you like to do today\?|Apa yang ingin Anda lakukan hari ini\?/i)).toBeVisible();

  await page.goto('/chat');
  await expect(page.getByRole('heading', { name: 'Baristachaw' })).toBeVisible();

  await page.goto('/scanner');
  await expect(page.getByRole('heading', { name: /Vision Scan|Pemindai Visual/i })).toBeVisible();

  await page.goto('/collection');
  await expect(page.getByRole('heading', { name: /Collection|Koleksi/i })).toBeVisible();

  await page.goto('/tools');
  await expect(page.getByRole('heading', { name: /Barista Tools|Alat Barista/i })).toBeVisible();
});

test('keyboard-open contracts reduce page bottom padding and keeps bottom filler disabled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const pageContainer = page.locator('.page-container').first();
  await expect(pageContainer).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.dataset.keyboardOpen = 'true';
    document.documentElement.style.setProperty('--safe-bottom', '16px');
    document.documentElement.style.setProperty('--bottom-nav-total-height', '104px');
  });

  const paddingBottom = await pageContainer.evaluate((el) => getComputedStyle(el).paddingBottom);
  expect(Number.parseFloat(paddingBottom)).toBeLessThanOrEqual(22);

  const fillerState = await page.locator('.bottom-nav-fill').first().evaluate((el) => {
    const style = getComputedStyle(el, '::after');
    return {
      display: style.display,
      content: style.content,
    };
  });
  expect(fillerState.display).toBe('none');
  expect(fillerState.content).toBe('none');
});

test('collection create-folder close button keeps iOS-friendly touch target', async ({ page }) => {
  await page.setViewportSize({ width: 371, height: 566 });
  await page.goto('/collection');
  await page.getByRole('button', { name: createFolderButton }).click();

  const closeButton = page.getByTestId('collection-close-create-folder');
  await expect(closeButton).toBeVisible();

  const metrics = await closeButton.evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      display: style.display,
      alignItems: style.alignItems,
      justifyContent: style.justifyContent,
      lineHeight: style.lineHeight,
    };
  });

  expect(metrics.width).toBeGreaterThanOrEqual(40);
  expect(metrics.height).toBeGreaterThanOrEqual(40);
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.documentClientWidth + 1);
  expect(metrics.display).toContain('flex');
  expect(metrics.alignItems).toBe('center');
  expect(metrics.justifyContent).toBe('center');

  await page.getByRole('textbox', { name: /Folder name|Nama Folder/i }).fill('qa_mobile_folder');
  await page.getByRole('button', { name: /^Save$|^Simpan$/i }).click();
  await expect(page.locator('h3', { hasText: /^qa_mobile_folder$/ }).first()).toBeVisible();

  const folderCard = page.locator('h3', { hasText: /^qa_mobile_folder$/ }).first().locator('xpath=ancestor::div[contains(@class,"group")]').first();
  await folderCard.getByRole('button', { name: /Open folder options|Buka opsi folder/i }).click();
  await folderCard.getByRole('button', { name: /^Delete$|^Hapus$/i }).click();

  const deleteDialog = page.getByRole('dialog', { name: /Delete folder|Hapus folder/i });
  await expect(deleteDialog).toBeVisible();
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
  const dialogBox = await deleteDialog.boundingBox();
  expect(dialogBox?.top ?? 0).toBeGreaterThanOrEqual(0);
  expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(566);
  await deleteDialog.locator('button', { hasText: /^Cancel$|^Batal$/i }).click();
  await expect(deleteDialog).toHaveCount(0);
});

test('mobile ai brew picker keeps dialog semantics and returns focus on close', async ({ page }) => {
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  const aiTab = page.getByRole('tab', { name: /AI Brew|AI Seduh/i });
  const builderOpen = page.getByTestId('ai-brew-open-quick');
  await expect(aiTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('ai-brew-landing-mode-hot')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-landing-mode-iced')).toHaveCount(0);
  await builderOpen.click();
  const pickerTrigger = page.getByTestId('ai-brew-dripper-picker');

  await pickerTrigger.click();
  const dialog = page.getByRole('dialog', { name: 'Dripper' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: /Close picker|Tutup picker|Tutup/i }).click();
  await expect(dialog).toHaveCount(0);
  await page.waitForTimeout(100);
  await expect(pickerTrigger).toBeFocused();
});

test('mobile ai brew quick generate supports Indonesian process and variety search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('ai-brew-open-quick').click();
  await page.getByTestId('ai-brew-bean-details-toggle').click();
  await page.getByTestId('ai-brew-process-picker').click();
  await page.getByTestId('ai-brew-picker-search-process').fill('giling basah');
  await page.getByTestId('ai-brew-picker-option-process-wet_hulled').click();
  await expect(page.getByTestId('ai-brew-process-picker')).toContainText(/Wet Hulled|Giling Basah/i);

  await page.getByTestId('ai-brew-variety-picker').click();
  await page.getByTestId('ai-brew-picker-search-variety').fill('s795');
  await page.getByTestId('ai-brew-picker-option-variety-s795').click();
  await expect(page.getByTestId('ai-brew-variety-picker')).toContainText(/S795/i);

  await page.evaluate(() => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="ai-brew-coffee-name"]'))
      .find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error('Missing field: ai-brew-coffee-name');
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (!descriptor?.set) throw new Error('Missing input setter: ai-brew-coffee-name');
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, 'Mobile Indonesia Matrix');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  });

  await expect(page.getByTestId('ai-brew-water-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-mode-manual')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);

  await page.getByTestId('ai-brew-generate').click();
  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText('Mobile Indonesia Matrix');
  const storedPlan = await page.evaluate(() => {
    const raw = localStorage.getItem('BARISTACHAW_AI_BREW_LAST_PLAN_V5');
    return raw ? JSON.parse(raw).payload : null;
  });
  expect(storedPlan?.process).toMatch(/Wet Hulled|Giling Basah/i);
  expect(storedPlan?.variety).toMatch(/S795/i);
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
});

test('mobile ai brew builder uses app fullscreen height in pwa profile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only fullscreen contract');

  await page.goto('/');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew&runtime=web_parity&ui_profile=pwa&host_safe_bottom=34', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('ai-brew-open-quick').click();
  const builder = page.getByTestId('ai-brew-builder-quick');
  await expect(builder).toBeVisible();

  const metrics = await builder.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const rootStyle = getComputedStyle(document.documentElement);
    const scrollRegion = el.querySelector<HTMLElement>('.overflow-y-auto');
    return {
      isPwa: document.documentElement.hasAttribute('data-pwa'),
      safeBottom: Number.parseFloat(rootStyle.getPropertyValue('--safe-bottom') || '0'),
      bottomGap: Math.abs(window.innerHeight - rect.bottom),
      heightDelta: Math.abs(window.innerHeight - rect.height),
      scrollPaddingBottom: Number.parseFloat(scrollRegion ? getComputedStyle(scrollRegion).paddingBottom : '0'),
    };
  });

  expect(metrics.isPwa).toBe(true);
  expect(metrics.safeBottom).toBeLessThanOrEqual(0.5);
  expect(metrics.bottomGap).toBeLessThanOrEqual(4);
  expect(metrics.heightDelta).toBeLessThanOrEqual(4);
  expect(metrics.scrollPaddingBottom).toBeGreaterThanOrEqual(27);
});

test('mobile ai brew result workspace keeps primary actions inside the viewport', async ({ page }) => {
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('ai-brew-open-quick').click();
  await page.evaluate(() => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="ai-brew-coffee-name"]'))
      .find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error('Missing field: ai-brew-coffee-name');
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (!descriptor?.set) throw new Error('Missing input setter: ai-brew-coffee-name');
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, 'Mobile Result QA');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  });
  await expect(page.getByTestId('ai-brew-coffee-name')).toHaveValue('Mobile Result QA');
  await expect(page.getByTestId('ai-brew-water-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-mode-manual')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-tab-plan')).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-tab-coach')).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-brief')).toHaveCount(0);
  await expect(result.getByTestId('ai-brew-result-summary-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-result-summary-metric-strip')).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-action-bar')).toBeVisible();
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-sequence-section')).toHaveCount(0);
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-current-card')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/(Tuangan berikutnya|Next pour)/);
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/(Sisa total|Total left)/);
  await expect(page.getByTestId('ai-brew-flow-toggle')).toBeVisible();

  const timerBox = await result.getByTestId('ai-brew-flow-timer-panel').boundingBox();
  const flowBox = await page.getByTestId('ai-brew-flow-toggle').boundingBox();
  expect(timerBox).toBeTruthy();
  expect(flowBox).toBeTruthy();
  expect(timerBox!.y).toBeLessThan(flowBox!.y);

  const actionBox = await page.getByTestId('ai-brew-result-action-bar').boundingBox();
  const viewport = page.viewportSize();
  expect(actionBox).toBeTruthy();
  expect(viewport).toBeTruthy();
  expect((actionBox?.y || 0) + (actionBox?.height || 0)).toBeLessThanOrEqual(viewport!.height);
});

test('mobile ai brew result stays legible in light theme', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('BARISTA_THEME', 'light');
  });

  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.evaluate(() => {
    localStorage.setItem('BARISTA_THEME', 'light');
  });
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('ai-brew-open-quick').click();
  await page.evaluate(() => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="ai-brew-coffee-name"]'))
      .find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error('Missing field: ai-brew-coffee-name');
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (!descriptor?.set) throw new Error('Missing input setter: ai-brew-coffee-name');
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, 'Light Theme QA');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  });
  await expect(page.getByTestId('ai-brew-coffee-name')).toHaveValue('Light Theme QA');

  await expect(page.getByTestId('ai-brew-water-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-mode-manual')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(result.locator('h3').filter({ hasText: 'Light Theme QA' })).toBeVisible();
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-current-card')).toBeVisible();

  const visualState = await page.evaluate(() => {
    const root = document.documentElement;
    const resultTitle = document.querySelector<HTMLElement>('[data-testid="ai-brew-result"] h3');
    const primaryAction = document.querySelector<HTMLElement>('[data-testid="ai-brew-flow-toggle"]');
    const stepCard = document.querySelector<HTMLElement>('[data-testid="ai-brew-flow-current-card"]');
    const stepText = stepCard?.querySelector<HTMLElement>('p');

    return {
      hasLightClass: root.classList.contains('light'),
      hasDarkClass: root.classList.contains('dark'),
      titleColor: resultTitle ? getComputedStyle(resultTitle).color : null,
      actionBackground: primaryAction ? getComputedStyle(primaryAction).backgroundColor : null,
      stepCardBackground: stepCard ? getComputedStyle(stepCard).backgroundColor : null,
      stepTextColor: stepText ? getComputedStyle(stepText).color : null,
    };
  });

  expect(visualState.hasLightClass).toBe(true);
  expect(visualState.hasDarkClass).toBe(false);
  expect(visualState.titleColor).not.toBe('rgb(255, 255, 255)');
  expect(visualState.stepTextColor).not.toBe('rgb(255, 255, 255)');
  expect(visualState.actionBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(visualState.stepCardBackground).not.toBe('rgba(0, 0, 0, 0)');
});

test('mobile ai brew loading stays centered and keeps bottom nav hidden through the result flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('ai-brew-open-quick').click();
  await page.evaluate(() => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="ai-brew-coffee-name"]'))
      .find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error('Missing field: ai-brew-coffee-name');
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (!descriptor?.set) throw new Error('Missing input setter: ai-brew-coffee-name');
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, 'Mobile Loading QA');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  });

  await expect(page.getByTestId('ai-brew-water-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-mode-manual')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
  await page.getByTestId('ai-brew-generate').click();

  const overlay = page.getByTestId('ai-brew-generation-overlay');
  await expect(overlay).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();

  const overlayCardLocator = page.getByTestId('ai-brew-generation-card');
  const overlayCardVisible = await overlayCardLocator.waitFor({ state: 'visible', timeout: 1500 })
    .then(() => true)
    .catch(() => false);
  if (overlayCardVisible) {
    const overlayCard = await overlayCardLocator.boundingBox();
    const viewport = page.viewportSize();
    expect(overlayCard).toBeTruthy();
    expect(viewport).toBeTruthy();
    const overlayCenterX = (overlayCard!.x) + (overlayCard!.width / 2);
    const overlayCenterY = (overlayCard!.y) + (overlayCard!.height / 2);
    expect(Math.abs(overlayCenterX - (viewport!.width / 2))).toBeLessThanOrEqual(48);
    expect(Math.abs(overlayCenterY - (viewport!.height / 2))).toBeLessThanOrEqual(84);
  }

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/(Tuangan berikutnya|Next pour)/);
});

test('mobile ai brew builder keeps the action footer docked to the modal bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('ai-brew-open-quick').click();

  const builder = page.getByTestId('ai-brew-builder-quick');
  const footer = page.getByTestId('ai-brew-builder-footer');
  const generateButton = page.getByTestId('ai-brew-generate');

  await expect(builder).toBeVisible();
  await expect(footer).toBeVisible();
  await expect(generateButton).toBeVisible();
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();

  const builderBox = await builder.boundingBox();
  const footerBox = await footer.boundingBox();
  const viewport = page.viewportSize();

  expect(builderBox).toBeTruthy();
  expect(footerBox).toBeTruthy();
  expect(viewport).toBeTruthy();

  const builderBottom = builderBox!.y + builderBox!.height;
  const footerBottom = footerBox!.y + footerBox!.height;

  expect(Math.abs(builderBottom - footerBottom)).toBeLessThanOrEqual(24);
  expect(Math.abs(viewport!.height - footerBottom)).toBeLessThanOrEqual(24);
});
