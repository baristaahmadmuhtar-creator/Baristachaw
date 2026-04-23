import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNoteDraftFromStorage, sanitizeNoteDraftForStorage } from '../../apps/web/src/features/collection/noteDraftState.ts';

test('parseNoteDraftFromStorage returns default draft for invalid JSON', () => {
  const result = parseNoteDraftFromStorage('{broken-json');
  assert.deepEqual(result, { title: '', markdown: '', folderId: '' });
});

test('parseNoteDraftFromStorage sanitizes invalid shape fields', () => {
  const raw = JSON.stringify({
    title: '  Espresso Notes  ',
    markdown: 42,
    folderId: null,
  });

  const result = parseNoteDraftFromStorage(raw);
  assert.equal(result.title, 'Espresso Notes');
  assert.equal(result.markdown, '');
  assert.equal(result.folderId, '');
});

test('sanitizeNoteDraftForStorage enforces safety caps', () => {
  const longTitle = 't'.repeat(400);
  const longMarkdown = 'm'.repeat(30_000);
  const longFolderId = 'f'.repeat(240);

  const result = sanitizeNoteDraftForStorage({
    title: ` ${longTitle} `,
    markdown: ` ${longMarkdown} `,
    folderId: ` ${longFolderId} `,
  });

  assert.equal(result.title.length, 160);
  assert.equal(result.markdown.length, 20_000);
  assert.equal(result.folderId.length, 120);
});
