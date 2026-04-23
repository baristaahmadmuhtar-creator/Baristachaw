import type { Page } from '@playwright/test';

export async function clearClientState(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    try {
      if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
        const dbs = await Promise.race([
          indexedDB.databases(),
          new Promise<Awaited<ReturnType<typeof indexedDB.databases>>>((resolve) => {
            window.setTimeout(() => resolve([]), 250);
          }),
        ]);

        dbs
          .map((db) => db.name)
          .filter(Boolean)
          .forEach((name) => {
            try {
              indexedDB.deleteDatabase(name as string);
            } catch {
              // Ignore IndexedDB cleanup failures during test isolation.
            }
          });
      }
    } catch {
      // Ignore IndexedDB cleanup failures during test isolation.
    }
  });
}
