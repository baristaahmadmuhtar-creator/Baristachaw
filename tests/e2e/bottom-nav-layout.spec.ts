import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';

const MOBILE_ROUTES_WITH_NAV = ['/', '/scanner', '/tools', '/collection'];

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('mobile bottom nav floats slightly above the home indicator across core routes', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only layout contract');

  for (const route of MOBILE_ROUTES_WITH_NAV) {
    await page.goto(route);

    const nav = page.getByTestId('mobile-bottom-nav');
    const surface = page.getByTestId('mobile-bottom-nav-surface');
    await expect(nav).toBeVisible();
    await expect(surface).toBeVisible();

    const metrics = await surface.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const gapToBottom = Math.max(0, window.innerHeight - rect.bottom);
      return { gapToBottom, height: rect.height, width: rect.width };
    });

    expect(metrics.gapToBottom).toBeGreaterThanOrEqual(8);
    expect(metrics.gapToBottom).toBeLessThanOrEqual(16);
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    expect(metrics.width).toBeLessThanOrEqual(360);
  }
});

test('mobile chat route does not render bottom nav', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only layout contract');

  await page.goto('/chat');
  await expect(page.getByTestId('mobile-bottom-nav')).toHaveCount(0);
});

test('bottom nav is icon-only visually while keeping accessible link names', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only visual contract');

  await page.goto('/tools');
  const nav = page.getByTestId('mobile-bottom-nav-surface');
  await expect(nav).toBeVisible();

  await expect(nav.getByRole('link', { name: /^(Home|Beranda)$/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /^(Scan|Scanner|Pemindai|Pengimbas)$/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /^(Tools|Alat)$/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /^(Collection|Koleksi)$/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /^(Chat|Obrolan)$/i })).toBeVisible();

  const visualLabelCount = await nav.evaluate((el) => {
    const spans = Array.from(el.querySelectorAll('span'));
    return spans.filter((span) => {
      if (span.classList.contains('sr-only')) return false;
      const text = span.textContent?.trim() || '';
      if (!text) return false;
      const style = window.getComputedStyle(span);
      if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') <= 0.01) {
        return false;
      }
      return true;
    }).length;
  });

  expect(visualLabelCount).toBe(0);
});

test('bottom nav disables filler pseudo and keeps surface padding bounded', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only layout contract');

  await page.goto('/tools');
  const wrapper = page.getByTestId('mobile-bottom-nav');
  const surface = page.getByTestId('mobile-bottom-nav-surface');
  await expect(wrapper).toBeVisible();
  await expect(surface).toBeVisible();

  const styles = await page.evaluate(() => {
    const wrapperEl = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav"]');
    const surfaceEl = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav-surface"]');
    if (!wrapperEl || !surfaceEl) {
      return null;
    }

    const fillerStyle = window.getComputedStyle(wrapperEl, '::after');
    const surfaceStyle = window.getComputedStyle(surfaceEl);
    const parsedFillerHeight = Number.parseFloat(fillerStyle.height || '0');
    const parsedSurfacePaddingBottom = Number.parseFloat(surfaceStyle.paddingBottom || '0');
    return {
      fillerDisplay: fillerStyle.display,
      fillerContent: fillerStyle.content,
      fillerHeight: Number.isFinite(parsedFillerHeight) ? parsedFillerHeight : 0,
      surfacePaddingBottom: Number.isFinite(parsedSurfacePaddingBottom) ? parsedSurfacePaddingBottom : 0,
    };
  });

  expect(styles).not.toBeNull();
  expect(styles?.fillerDisplay).toBe('none');
  expect(styles?.fillerContent).toBe('none');
  expect(styles?.fillerHeight ?? 0).toBeLessThanOrEqual(0.5);
  expect(styles?.surfacePaddingBottom ?? 0).toBeGreaterThanOrEqual(4);
  expect(styles?.surfacePaddingBottom ?? 0).toBeLessThanOrEqual(20);
});

test('pwa fullscreen docks bottom nav flush to the viewport without safe-area filler layers', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only pwa layout contract');

  await page.goto('/tools?runtime=web_parity&ui_profile=pwa');
  const wrapper = page.getByTestId('mobile-bottom-nav');
  const surface = page.getByTestId('mobile-bottom-nav-surface');
  const pageContainer = page.locator('.page-container').first();
  await expect(wrapper).toBeVisible();
  await expect(surface).toBeVisible();
  await expect(pageContainer).toBeVisible();

  const metrics = await page.evaluate(() => {
    const wrapperEl = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav"]');
    const surfaceEl = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav-surface"]');
    const pageEl = document.querySelector<HTMLElement>('.page-container');
    if (!wrapperEl || !surfaceEl || !pageEl) return null;
    const rootStyle = getComputedStyle(document.documentElement);
    const wrapperStyle = getComputedStyle(wrapperEl);
    const pageStyle = getComputedStyle(pageEl);
    const surfaceStyle = getComputedStyle(surfaceEl);
    const bodyAfterStyle = getComputedStyle(document.body, '::after');
    const surfaceRect = surfaceEl.getBoundingClientRect();
    return {
      isPwa: document.documentElement.hasAttribute('data-pwa'),
      safeBottom: Number.parseFloat(rootStyle.getPropertyValue('--safe-bottom') || '0'),
      edgeSafeBottom: Number.parseFloat(rootStyle.getPropertyValue('--edge-safe-bottom') || '0'),
      pwaBottomBleed: Number.parseFloat(rootStyle.getPropertyValue('--pwa-bottom-bleed') || '0'),
      floatingGap: Number.parseFloat(wrapperStyle.paddingBottom || '0'),
      wrapperBottom: Number.parseFloat(wrapperStyle.bottom || '0'),
      gapToBottom: Math.max(0, window.innerHeight - surfaceRect.bottom),
      pagePaddingBottom: Number.parseFloat(pageStyle.paddingBottom || '0'),
      surfaceHeight: surfaceRect.height,
      surfaceShadow: surfaceStyle.boxShadow,
      wrapperBackground: wrapperStyle.backgroundColor,
      bodyAfterContent: bodyAfterStyle.content,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.isPwa).toBe(true);
  expect(metrics?.safeBottom ?? 99).toBeLessThanOrEqual(0.5);
  expect(metrics?.edgeSafeBottom ?? 99).toBeLessThanOrEqual(0.5);
  expect(metrics?.pwaBottomBleed ?? 99).toBeLessThanOrEqual(0.5);
  expect(metrics?.floatingGap ?? 99).toBeLessThanOrEqual(0.5);
  expect(metrics?.wrapperBottom ?? 99).toBeLessThanOrEqual(0.5);
  expect(metrics?.gapToBottom ?? 99).toBeLessThanOrEqual(2);
  expect(metrics?.pagePaddingBottom ?? 0).toBeGreaterThanOrEqual((metrics?.surfaceHeight ?? 0) - 1);
  expect(metrics?.pagePaddingBottom ?? 99).toBeLessThanOrEqual((metrics?.surfaceHeight ?? 0) + 8);
  expect(metrics?.surfaceShadow).toBe('none');
  expect(metrics?.wrapperBackground).toBe('rgba(0, 0, 0, 0)');
  expect(metrics?.bodyAfterContent).toBe('none');
});

test('pwa bottom nav stays visible instead of leaving an empty safe-area spacer', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only pwa layout contract');

  await page.goto('/tools?runtime=web_parity&ui_profile=pwa');
  const nav = page.getByTestId('mobile-bottom-nav');
  await expect(nav).toBeVisible();

  await page.waitForTimeout(3100);
  await expect(nav).toBeVisible();

  await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>('.page-container');
    if (!container) return;
    container.scrollTop = 360;
    container.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(nav).toBeVisible();
});

test('pwa viewport remains full-height after landscape to portrait rotation', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only pwa layout contract');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools?runtime=web_parity&ui_profile=pwa');
  await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(700);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);

  const metrics = await page.evaluate(() => {
    const root = document.getElementById('root');
    const nav = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav-surface"]');
    if (!root || !nav) return null;
    const rootRect = root.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      viewportHeight: window.innerHeight,
      rootBottomGap: Math.max(0, window.innerHeight - rootRect.bottom),
      navBottomGap: Math.max(0, window.innerHeight - navRect.bottom),
      appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.rootBottomGap ?? 99).toBeLessThanOrEqual(2);
  expect(metrics?.navBottomGap ?? 99).toBeLessThanOrEqual(2);
  expect(metrics?.appHeight).toBe(`${metrics?.viewportHeight}px`);
});

test('manifest requests fullscreen PWA display with standalone fallback', async ({ page }) => {
  const response = await page.request.get('/manifest.json?v=20260417b');
  expect(response.ok()).toBe(true);

  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.display_override).toEqual(expect.arrayContaining(['fullscreen', 'standalone']));
  expect(manifest.theme_color).toBe('#0A84FF');
  expect(manifest.background_color).toBe('#F5F8FE');
});

test('bottom nav auto-hides on downward scroll and reveals on interaction', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only auto-hide contract');

  await page.goto('/tools');
  const nav = page.getByTestId('mobile-bottom-nav');
  await expect(nav).toBeVisible();

  await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>('.page-container');
    if (!container) return;
    container.scrollTop = 320;
    container.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(nav).toBeHidden();

  await page.mouse.click(180, 180);
  await expect(nav).toBeVisible();
});

test('desktop does not show mobile bottom nav', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('Mobile'), 'desktop-only layout contract');

  await page.goto('/');
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
});

test('bottom nav hides when keyboard metrics report open', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only keyboard contract');

  await page.goto('/tools');
  const nav = page.getByTestId('mobile-bottom-nav');
  await expect(nav).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: { keyboardOpen: true, keyboardOffset: 280 },
    }));
  });
  await expect(nav).toBeHidden();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: { keyboardOpen: false, keyboardOffset: 0 },
    }));
  });
  await expect(nav).toBeVisible();
});
