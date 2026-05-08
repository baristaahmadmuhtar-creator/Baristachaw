import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const FILES = [
  'apps/mobile/src/screens/HomeScreen.tsx',
  'apps/mobile/src/screens/CollectionScreen.tsx',
  'apps/mobile/src/screens/ScannerScreen.tsx',
] as const;

test('localized mobile shell screens avoid english parity constants in user-facing copy', () => {
  for (const relativePath of FILES) {
    const source = readFileSync(path.join(ROOT, relativePath), 'utf8');
    assert.doesNotMatch(source, /HOME_PARITY|COLLECTION_PARITY|SCANNER_PARITY/, `${relativePath} should use localized copy instead of shared English parity constants`);
  }
});
