import type { Page } from '@playwright/test';
import { EQUIPMENT_PREFERENCES_KEY } from '../../apps/web/src/services/equipmentPreferences';

type ClearClientStateOptions = {
  onboarding?: 'completed' | 'fresh';
};

export async function clearClientState(
  page: Page,
  { onboarding = 'completed' }: ClearClientStateOptions = {},
) {
  await page.evaluate(async ({ equipmentPreferencesKey, onboardingState }) => {
    localStorage.clear();
    sessionStorage.clear();

    if (onboardingState === 'completed') {
      const completedAt = Date.now();
      localStorage.setItem(equipmentPreferencesKey, JSON.stringify({
        completedAt,
        skippedEquipmentAt: completedAt,
      }));
    }

    try {
      if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
        const dbs = await Promise.race([
          indexedDB.databases(),
          new Promise<Awaited<ReturnType<typeof indexedDB.databases>>>((resolve) => {
            window.setTimeout(() => resolve([]), 1_000);
          }),
        ]);

        await Promise.all(dbs.map(async ({ name }) => {
          if (!name) return;

          await new Promise<void>((resolve) => {
            const request = indexedDB.open(name);
            const finish = () => resolve();

            request.onerror = finish;
            request.onblocked = finish;
            request.onsuccess = () => {
              const db = request.result;
              const storeNames = Array.from(db.objectStoreNames);
              if (storeNames.length === 0) {
                db.close();
                resolve();
                return;
              }

              try {
                const transaction = db.transaction(storeNames, 'readwrite');
                transaction.oncomplete = () => {
                  db.close();
                  resolve();
                };
                transaction.onerror = () => {
                  db.close();
                  resolve();
                };
                transaction.onabort = () => {
                  db.close();
                  resolve();
                };
                storeNames.forEach((storeName) => transaction.objectStore(storeName).clear());
              } catch {
                db.close();
                resolve();
              }
            };

            window.setTimeout(finish, 2_000);
          });
        }));
      }
    } catch {
      // Ignore IndexedDB cleanup failures during test isolation.
    }
  }, {
    equipmentPreferencesKey: EQUIPMENT_PREFERENCES_KEY,
    onboardingState: onboarding,
  });
}
