import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const baseRoute of ['/masuk?lang=id', '/daftar?lang=id']) {
  for (const theme of ['light', 'dark'] as const) {
    const route = `${baseRoute}&theme=${theme}`;
    test(`a11y ${route} has no serious/critical violations`, async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(900);
      const results = await new AxeBuilder({ page }).analyze();
      const severe = results.violations.filter((violation) =>
        violation.impact === 'critical' || violation.impact === 'serious'
      );

      expect(
        severe,
        severe.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
      ).toEqual([]);
    });
  }
}
