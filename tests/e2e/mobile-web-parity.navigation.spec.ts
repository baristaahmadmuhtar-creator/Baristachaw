import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { expectMobileParityPageHealthy, mobileParityPath } from '../helpers/mobileParity';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

const CORE_ROUTES = [
  { route: '/', heading: /Baristachaw/i },
  { route: '/tools', heading: /Alat Barista|Barista Tools/i },
  { route: '/collection', heading: /Koleksi|Collection/i },
  { route: '/scanner', heading: /Pemindai Visual|Vision Scan/i },
  { route: '/chat', heading: /Baristachaw/i },
] as const;

test('web parity native shell renders every core mobile route without blank or broken states', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  for (const entry of CORE_ROUTES) {
    await page.goto(mobileParityPath(entry.route, { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: entry.heading }).first(), `${entry.route} expected localized route content`).toBeVisible();
    await expectMobileParityPageHealthy(page, entry.route);
  }
});

test('visible mobile bottom nav links open working parity routes', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools', { platform: 'android', language: 'id', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });

  const nav = page.getByTestId('mobile-bottom-nav-surface');
  await expect(nav).toBeVisible();

  const targets = [
    { name: /Beranda|Home/i, expectedUrl: /\/($|\?)/, expectedHeading: /Baristachaw/i },
    { name: /Pindai|Pemindai|Scan/i, expectedUrl: /\/scanner/, expectedHeading: /Pemindai Visual|Vision Scan/i },
    { name: /Alat|Tools/i, expectedUrl: /\/tools/, expectedHeading: /Alat Barista|Barista Tools/i },
    { name: /Koleksi|Collection/i, expectedUrl: /\/collection/, expectedHeading: /Koleksi|Collection/i },
    { name: /Obrolan|Chat/i, expectedUrl: /\/chat/, expectedHeading: /Baristachaw/i },
  ];

  for (const target of targets) {
    await nav.getByRole('link', { name: target.name }).click();
    await expect(page).toHaveURL(target.expectedUrl);
    await expect(page.getByRole('heading', { name: target.expectedHeading }).first()).toBeVisible();
    await expectMobileParityPageHealthy(page, `nav ${target.name}`);
  }
});
