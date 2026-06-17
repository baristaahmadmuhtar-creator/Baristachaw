import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SERVER_API_DIR = path.resolve(process.cwd(), 'server-api');
const FILES = [
  path.join(SERVER_API_DIR, 'ai.ts'),
  path.join(SERVER_API_DIR, 'chat.ts'),
  path.join(SERVER_API_DIR, '_orchestration.ts'),
  path.join(SERVER_API_DIR, 'account', 'status.ts'),
  path.join(SERVER_API_DIR, 'admin', 'management.ts'),
  path.join(SERVER_API_DIR, 'billing', 'manualPayments.ts'),
];

test('server-api AI runtime files avoid direct shared src runtime imports', () => {
  for (const file of FILES.slice(0, 3)) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /^import\s+(?!type\b).*['"]\.\.\/packages\/shared\/src\//m,
      `${path.basename(file)} should not import workspace shared source at runtime`,
    );
  }
});

test('serverless account admin and billing routes avoid workspace package plan catalog imports', () => {
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from\s+['"]@baristachaw\/shared\/planCatalog['"]/,
      `${path.relative(process.cwd(), file)} should import the plan catalog through a bundleable relative path for Vercel serverless runtime`,
    );
  }
});
