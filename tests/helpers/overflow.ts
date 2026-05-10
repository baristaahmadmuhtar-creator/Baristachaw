import { expect, type Page } from '@playwright/test';

type OverflowResult = {
  innerWidth: number;
  docClientWidth: number;
  docScrollWidth: number;
  bodyClientWidth: number;
  bodyScrollWidth: number;
  offenders: Array<{
    tag: string;
    testid: string | null;
    className: string;
    text: string;
    left: number;
    right: number;
    width: number;
    overflowX: string;
  }>;
};

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          testid: el.getAttribute('data-testid'),
          className: String(el.getAttribute('class') || '').slice(0, 160),
          text: String(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          overflowX: style.overflowX,
        };
      })
      .filter((item) => item.right > window.innerWidth + 1 || item.left < -1)
      .slice(0, 20);

    return {
      innerWidth: window.innerWidth,
      docClientWidth: doc.clientWidth,
      docScrollWidth: doc.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      offenders,
    };
  }) satisfies OverflowResult;

  const details = `${label}: ${JSON.stringify(result, null, 2)}`;
  expect(result.docScrollWidth, `${details}\ndocument overflow`).toBeLessThanOrEqual(result.docClientWidth + 1);
  expect(result.bodyScrollWidth, `${details}\nbody overflow`).toBeLessThanOrEqual(result.bodyClientWidth + 1);
}

export function collectFatalBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return {
    expectNoFatalErrors(label: string) {
      const fatal = errors.filter((message) => (
        /uncaught|hydration|typeerror|cannot read|module import|failed to fetch dynamically imported module|resizeobserver loop completed/i.test(message)
        && !/ResizeObserver loop limit exceeded/i.test(message)
      ));
      expect(fatal, `${label}: fatal browser errors`).toEqual([]);
    },
  };
}
