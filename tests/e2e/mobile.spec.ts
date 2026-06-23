import { test, expect, type Page } from '@playwright/test';
import { clearClientState } from '../helpers/cleanup';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

const createFolderButton = /Create Folder|Buat Folder/i;

async function openAiBrewResult(page: Page, mode: 'quick' | 'pro', coffeeName: string) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId(mode === 'quick' ? 'ai-brew-open-quick' : 'ai-brew-open-pro').click();
  await page.getByTestId('ai-brew-coffee-name').fill(coffeeName);

  if (mode === 'pro') {
    await page.getByTestId('ai-brew-water-picker').click();
    await page.getByTestId('ai-brew-picker-search-water_brand').fill('aqua');
    await page.getByTestId('ai-brew-picker-option-water_brand-aqua-id').click();
  }

  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible({ timeout: 25_000 });
}

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

test('home quick actions place Grind below Baristachaw and Vision Scan below Barista Tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?language=id', { waitUntil: 'domcontentloaded' });

  const cardLinks = page.getByTestId('home-primary-action-card');
  await expect(cardLinks).toHaveCount(6);
  const hrefs = await cardLinks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));

  expect(hrefs).toEqual([
    '/chat',
    '/tools?tab=ratio&panel=grind-size',
    '/tools?tab=ai-brew',
    '/tools',
    '/scanner',
    '/collection',
  ]);
  await expect(page.getByRole('link', { name: /Ukuran Giling|Grind Size/i })).toBeVisible();
});

test('keyboard-open contracts reduce page bottom padding and keeps bottom filler disabled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const pageContainer = page.locator('.page-container').first();
  await expect(pageContainer).toBeVisible();

  // Let the initial viewport sync burst settle before simulating keyboard state.
  // Otherwise the app's pageshow follow-up can overwrite the synthetic root flag.
  await page.waitForTimeout(650);

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
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  const aiTab = page.locator('#tools-tab-ai_brew');
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
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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
  await expect(result).toBeVisible({ timeout: 25_000 });
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
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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

test('mobile ai brew result workspace keeps primary actions inside the viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only viewport and action bar visibility checks');
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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
  await expect(result).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId('ai-brew-result-tab-plan')).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-tab-coach')).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-brief')).toHaveCount(0);
  await expect(result.getByTestId('ai-brew-result-summary-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-result-summary-metric-strip')).toBeVisible();
  await expect(page.getByTestId('ai-brew-result-action-bar')).toBeVisible();
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-current-card')).toBeVisible();
  await expect(result.getByTestId('ai-brew-sequence-section')).toBeVisible();
  await expect(result.locator('[data-testid^="ai-brew-step-card-"]').first()).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/(Berikutnya|Next)/);
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/(Sisa total|Total left)/);
  const liteRingBox = await result.getByTestId('ai-brew-lite-progress-ring').boundingBox();
  const liteStatusBox = await result.getByTestId('ai-brew-flow-remaining-status').boundingBox();
  expect(liteRingBox).toBeTruthy();
  expect(liteStatusBox).toBeTruthy();
  expect((liteStatusBox?.y || 0) + (liteStatusBox?.height || 0)).toBeLessThanOrEqual(
    (liteRingBox?.y || 0) + (liteRingBox?.height || 0) - 8,
  );
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
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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
  await expect(result).toBeVisible({ timeout: 25_000 });
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
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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
  await expect(overlayCardLocator).toBeVisible();
  await expect.poll(async () => {
    const box = await overlayCardLocator.boundingBox();
    return box ? box.width : 0;
  }).toBeGreaterThan(10);

  const overlayCard = await overlayCardLocator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }).catch(() => null);
  if (overlayCard) {
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const overlayCenterX = overlayCard.x + (overlayCard.width / 2);
    const overlayCenterY = overlayCard.y + (overlayCard.height / 2);
    expect(Math.abs(overlayCenterX - (viewport!.width / 2))).toBeLessThanOrEqual(48);
    expect(Math.abs(overlayCenterY - (viewport!.height / 2))).toBeLessThanOrEqual(84);
  }

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/(Berikutnya|Next)/);
});

test('mobile ai brew builder keeps the action footer docked to the modal bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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

  expect(Math.abs(builderBottom - footerBottom)).toBeLessThanOrEqual(2);
  expect(Math.abs(viewport!.height - footerBottom)).toBeLessThanOrEqual(2);

  const bottomHitTarget = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return {
      insideBuilder: !!target?.closest('[data-testid^="ai-brew-builder-"]'),
      insidePanel: !!target?.closest('[data-testid="ai-brew-panel"]'),
    };
  }, { x: Math.round(viewport!.width / 2), y: viewport!.height - 1 });

  expect(bottomHitTarget.insideBuilder).toBe(true);
  expect(bottomHitTarget.insidePanel).toBe(true);
});

test('mobile ai brew advanced builder covers the viewport through its action footer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?tab=ai-brew');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('ai-brew-open-pro').click();

  const builder = page.getByTestId('ai-brew-builder-pro');
  const footer = page.getByTestId('ai-brew-builder-footer');
  await expect(builder).toBeVisible();
  await expect(footer).toBeVisible();

  const [builderBox, footerBox] = await Promise.all([
    builder.boundingBox(),
    footer.boundingBox(),
  ]);
  expect(builderBox).toBeTruthy();
  expect(footerBox).toBeTruthy();
  expect(Math.abs(844 - (builderBox!.y + builderBox!.height))).toBeLessThanOrEqual(2);
  expect(Math.abs(844 - (footerBox!.y + footerBox!.height))).toBeLessThanOrEqual(2);

  const bottomTarget = await page.evaluate(() => (
    document.elementFromPoint(Math.round(window.innerWidth / 2), window.innerHeight - 1)
      ?.closest('[data-testid="ai-brew-builder-pro"]')
      ?.getAttribute('data-testid') || ''
  ));
  expect(bottomTarget).toBe('ai-brew-builder-pro');
});

test('mobile ai brew builder keeps focused inputs and footer above simulated iOS keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/tools?tab=ai-brew&runtime=web_parity&ui_profile=pwa&host_safe_bottom=34', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('ai-brew-open-quick').click();

  const builder = page.getByTestId('ai-brew-builder-quick');
  const coffeeNameInput = page.getByTestId('ai-brew-coffee-name');
  await expect(builder).toBeVisible();
  await coffeeNameInput.focus();
  await page.waitForTimeout(650);
  await page.evaluate(() => {
    document.documentElement.dataset.keyboardOpen = 'true';
    document.documentElement.style.setProperty('--keyboard-offset', '280px');
    document.documentElement.style.setProperty('--keyboard-overlay-offset', '280px');
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: {
        keyboardOpen: true,
        keyboardOffset: 280,
        keyboardOverlayOffset: 280,
        layoutHeight: window.innerHeight,
        visualHeight: window.innerHeight - 280,
        visualOffsetTop: 0,
        visualBottom: window.innerHeight - 280,
        baselineLayoutHeight: window.innerHeight,
        baselineVisualBottom: window.innerHeight,
      },
    }));
  });

  const readMetrics = () => builder.evaluate((el) => {
    const input = el.querySelector<HTMLElement>('[data-testid="ai-brew-coffee-name"]');
    const generate = el.querySelector<HTMLElement>('[data-testid="ai-brew-generate"]');
    const scroll = el.querySelector<HTMLElement>('[data-testid="ai-brew-builder-scroll"]');
    const inputRect = input?.getBoundingClientRect();
    const generateRect = generate?.getBoundingClientRect();
    const viewportSafeBottom = window.innerHeight - 280;
    return {
      inputBottom: inputRect ? inputRect.bottom : 0,
      generateBottom: generateRect ? generateRect.bottom : 0,
      viewportSafeBottom,
      scrollPaddingBottom: scroll ? Number.parseFloat(getComputedStyle(scroll).paddingBottom) : 0,
    };
  });

  await expect.poll(async () => {
    const metrics = await readMetrics();
    return Math.round(metrics.generateBottom - metrics.viewportSafeBottom);
  }, { timeout: 2000 }).toBeLessThanOrEqual(48);

  const metrics = await readMetrics();
  expect(metrics.inputBottom).toBeLessThanOrEqual(metrics.viewportSafeBottom + 8);
  expect(metrics.scrollPaddingBottom).toBeGreaterThanOrEqual(300);

  await page.evaluate(() => {
    document.documentElement.dataset.keyboardOpen = 'false';
    document.documentElement.style.setProperty('--keyboard-offset', '0px');
    document.documentElement.style.setProperty('--keyboard-overlay-offset', '0px');
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: {
        keyboardOpen: false,
        keyboardOffset: 0,
        keyboardOverlayOffset: 0,
        layoutHeight: window.innerHeight,
        visualHeight: window.innerHeight,
        visualOffsetTop: 0,
        visualBottom: window.innerHeight,
        baselineLayoutHeight: window.innerHeight,
        baselineVisualBottom: window.innerHeight,
      },
    }));
  });
  await coffeeNameInput.blur();

  await expect.poll(async () => {
    const footerBox = await page.getByTestId('ai-brew-builder-footer').boundingBox();
    return footerBox ? Math.round(footerBox.y + footerBox.height) : 0;
  }).toBe(844);
});

test('mobile ai brew picker stays usable for overlay and adjustResize keyboards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/tools?tab=ai-brew&runtime=web_parity&ui_profile=native_shell&host_safe_bottom=28', {
    waitUntil: 'domcontentloaded',
  });
  await page.getByTestId('ai-brew-open-pro').click();
  await page.locator('[data-testid="ai-brew-process-picker"]:visible').click();

  const pickerDialog = page.getByRole('dialog').last();
  const search = page.getByTestId('ai-brew-picker-search-process');
  const list = page.getByTestId('ai-brew-picker-process');
  await expect(search).toBeVisible();
  await search.click();
  await expect(search).toBeFocused();
  await page.waitForTimeout(650);

  await page.evaluate(() => {
    document.documentElement.dataset.keyboardOpen = 'true';
    document.documentElement.style.setProperty('--app-height-visual', '564px');
    document.documentElement.style.setProperty('--keyboard-offset', '280px');
    document.documentElement.style.setProperty('--keyboard-overlay-offset', '280px');
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: {
        keyboardOpen: true,
        keyboardOffset: 280,
        keyboardOverlayOffset: 280,
        layoutHeight: 844,
        visualHeight: 564,
        visualOffsetTop: 0,
        visualBottom: 564,
        baselineLayoutHeight: 844,
        baselineVisualBottom: 844,
      },
    }));
  });

  await expect.poll(async () => {
    const box = await pickerDialog.boundingBox();
    return box ? Math.round(box.y + box.height) : 0;
  }).toBeLessThanOrEqual(564);
  const overlaySearchBox = await search.boundingBox();
  const overlayListBox = await list.boundingBox();
  expect(overlaySearchBox).toBeTruthy();
  expect(overlayListBox).toBeTruthy();
  expect(overlaySearchBox!.y + overlaySearchBox!.height).toBeLessThanOrEqual(564);
  expect(overlayListBox!.y).toBeLessThan(564);

  await page.evaluate(() => {
    document.documentElement.style.setProperty('--keyboard-overlay-offset', '0px');
  });
  await page.setViewportSize({ width: 390, height: 544 });
  await expect.poll(async () => {
    const box = await pickerDialog.boundingBox();
    return box ? Math.round(box.y + box.height) : 0;
  }).toBeLessThanOrEqual(544);
  const resizedSearchBox = await search.boundingBox();
  expect(resizedSearchBox).toBeTruthy();
  expect(resizedSearchBox!.y + resizedSearchBox!.height).toBeLessThanOrEqual(544);
});

test('mobile ai brew result has no horizontal overflow and keeps touch targets comfortable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only touch target checks');
  await openAiBrewResult(page, 'pro', 'Mobile Overflow QA');

  const result = page.getByTestId('ai-brew-result');
  const overflowState = await result.evaluate((el) => {
    const rootOverflow = el.scrollWidth - el.clientWidth;
    const offenders = Array.from(el.querySelectorAll<HTMLElement>('*'))
      .filter((child) => {
        const style = getComputedStyle(child);
        if (style.overflowX === 'hidden' || style.overflowX === 'clip' || style.overflowX === 'auto' || style.overflowX === 'scroll') return false;
        return child.scrollWidth > child.clientWidth + 2;
      })
      .slice(0, 5)
      .map((child) => ({
        testId: child.getAttribute('data-testid'),
        tag: child.tagName.toLowerCase(),
        overflow: child.scrollWidth - child.clientWidth,
      }));
    return { rootOverflow, offenders };
  });

  expect(overflowState.rootOverflow).toBeLessThanOrEqual(2);
  expect(overflowState.offenders).toEqual([]);

  const targetMetrics = await page.locator([
    '[data-testid="ai-brew-result-actions"] button',
    '[data-testid="ai-brew-taste-feedback"] button',
    '[data-testid="ai-brew-feedback-note"]',
  ].join(',')).evaluateAll((elements) => elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        testId: element.getAttribute('data-testid'),
        width: rect.width,
        height: rect.height,
      };
    }));

  expect(targetMetrics.length).toBeGreaterThanOrEqual(2);
  for (const metric of targetMetrics) {
    expect(metric.width, `${metric.testId || 'control'} width`).toBeGreaterThanOrEqual(44);
    expect(metric.height, `${metric.testId || 'control'} height`).toBeGreaterThanOrEqual(44);
  }
});

test('mobile ai brew result tabs support arrow home and end keyboard navigation', async ({ page }) => {
  await openAiBrewResult(page, 'pro', 'Mobile Tab Keyboard QA');

  const planTab = page.getByTestId('ai-brew-result-tab-plan');
  const flowTab = page.getByTestId('ai-brew-result-tab-flow');
  const coachTab = page.getByTestId('ai-brew-result-tab-coach');
  await expect(planTab).toHaveAttribute('aria-selected', 'true');

  await planTab.focus();
  await planTab.press('ArrowRight');
  await expect(flowTab).toHaveAttribute('aria-selected', 'true');
  await expect(flowTab).toBeFocused();

  await flowTab.press('End');
  await expect(coachTab).toHaveAttribute('aria-selected', 'true');
  await expect(coachTab).toBeFocused();

  await coachTab.press('Home');
  await expect(planTab).toHaveAttribute('aria-selected', 'true');
  await expect(planTab).toBeFocused();
});
