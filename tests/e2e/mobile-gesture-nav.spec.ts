import { expect, test, type Page } from '@playwright/test';

async function swipe(page: Page, startX: number, endX: number, y: number) {
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.mouse.up();
}

test('mobile swipe left and right navigates between adjacent pages', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only swipe navigation');

  await page.goto('/scanner');
  const layer = page.getByTestId('app-route-layer');
  await expect(layer).toBeVisible();

  const box = await layer.boundingBox();
  if (!box) throw new Error('Route layer box unavailable');
  const y = box.y + Math.min(120, Math.floor(box.height * 0.24));
  const startRight = box.x + Math.floor(box.width * 0.86);
  const endLeft = box.x + Math.floor(box.width * 0.18);
  const startLeft = box.x + Math.floor(box.width * 0.14);
  const endRight = box.x + Math.floor(box.width * 0.82);

  await swipe(page, startRight, endLeft, y);
  await expect(page).toHaveURL(/\/tools$/);
  await page.waitForTimeout(180);

  const toolsLayer = page.getByTestId('app-route-layer');
  await expect(toolsLayer).toBeVisible();
  const toolsBox = await toolsLayer.boundingBox();
  if (!toolsBox) throw new Error('Tools route layer box unavailable');
  const toolsY = toolsBox.y + Math.floor(toolsBox.height * 0.72);
  const toolsStartLeft = toolsBox.x + Math.floor(toolsBox.width * 0.14);
  const toolsEndRight = toolsBox.x + Math.floor(toolsBox.width * 0.82);

  await swipe(page, toolsStartLeft, toolsEndRight, toolsY);
  await expect(page).toHaveURL(/\/scanner$/);
});

test('mobile swipe gesture ignores interactive button targets', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only swipe navigation');

  await page.goto('/tools');
  await expect(page).toHaveURL(/\/tools$/);
  const ratioButton = page.getByRole('tab', { name: /Calculator|Kalkulator|Ratio|Rasio/ });
  await expect(ratioButton).toBeVisible();

  const buttonBox = await ratioButton.boundingBox();
  if (!buttonBox) throw new Error('Ratio button box unavailable');

  const y = buttonBox.y + buttonBox.height / 2;
  const startX = buttonBox.x + buttonBox.width * 0.88;
  const endX = buttonBox.x + buttonBox.width * 0.08;
  await swipe(page, startX, endX, y);

  await expect.poll(() => new URL(page.url()).pathname).toBe('/tools');
  await expect(page).toHaveURL(/\/tools(\?tab=ratio)?$/);
});

test('mobile swipe still navigates from chat when bottom nav is hidden', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only swipe navigation');

  await page.goto('/chat');
  const layer = page.getByTestId('app-route-layer');
  await expect(layer).toBeVisible();
  await page.waitForTimeout(180);

  const box = await layer.boundingBox();
  if (!box) throw new Error('Route layer box unavailable');
  // Keep swipe gesture on a non-interactive strip for stable route-layer detection.
  const y = box.y + Math.min(120, Math.floor(box.height * 0.24));
  const startLeft = box.x + Math.floor(box.width * 0.14);
  const endRight = box.x + Math.floor(box.width * 0.82);
  const startRight = box.x + Math.floor(box.width * 0.86);
  const endLeft = box.x + Math.floor(box.width * 0.18);

  await swipe(page, startLeft, endRight, y);
  await expect(page).toHaveURL(/\/collection$/);
  await page.waitForTimeout(180);

  await swipe(page, startRight, endLeft, y);
  if (!/\/chat$/.test(page.url())) {
    const fallbackY = box.y + Math.floor(box.height * 0.74);
    await swipe(page, startRight, endLeft, fallbackY);
  }
  await expect(page).toHaveURL(/\/chat$/);
});
