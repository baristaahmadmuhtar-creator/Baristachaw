import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTodoItemsFromStorage } from '../../apps/web/src/features/barista-tools/todoState.ts';

test('parseTodoItemsFromStorage returns empty array for invalid JSON payload', () => {
  const result = parseTodoItemsFromStorage('{bad-json');
  assert.deepEqual(result, []);
});

test('parseTodoItemsFromStorage filters invalid entries and trims values', () => {
  const payload = JSON.stringify([
    { id: '  a1  ', text: '  steam wand purge  ', done: false },
    { id: '', text: 'missing id', done: true },
    { id: 'a2', text: 'ok', done: 'true' },
    null,
  ]);

  const result = parseTodoItemsFromStorage(payload);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], { id: 'a1', text: 'steam wand purge', done: false });
});

test('parseTodoItemsFromStorage enforces safety caps for payload size and text length', () => {
  const veryLongText = 'x'.repeat(600);
  const entries = Array.from({ length: 250 }, (_, idx) => ({
    id: `todo-${idx}`,
    text: veryLongText,
    done: false,
  }));

  const result = parseTodoItemsFromStorage(JSON.stringify(entries));
  assert.equal(result.length, 200);
  assert.equal(result[0].text.length, 280);
});
