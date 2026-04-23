import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'C:/Users/Alpha/Downloads/Baristachaw';

const FILES = [
  'apps/mobile/App.tsx',
  'apps/mobile/src/screens/HomeScreen.tsx',
  'apps/mobile/src/screens/CollectionScreen.tsx',
  'apps/mobile/src/screens/ScannerScreen.tsx',
  'apps/mobile/src/screens/ToolsScreen.tsx',
  'apps/mobile/src/screens/WebParityScreen.tsx',
] as const;

test('mobile shell and non-chat screens read preferred app language instead of raw device locale', () => {
  for (const relativePath of FILES) {
    const source = readFileSync(`${ROOT}/${relativePath}`, 'utf8');
    assert.match(source, /usePreferredMobileLanguage/, `${relativePath} should use the preferred mobile language hook`);
    assert.doesNotMatch(
      source,
      /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.locale/,
      `${relativePath} should not read device locale directly for UI localization`,
    );
  }
});
