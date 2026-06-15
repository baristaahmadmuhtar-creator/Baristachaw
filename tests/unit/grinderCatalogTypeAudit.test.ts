import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGrinderDriveType, normalizeBurrType } from '../../apps/web/src/features/ai-brew/catalog.ts';

test('normalizeGrinderDriveType correctly identifies drive types', () => {
  assert.equal(normalizeGrinderDriveType('hand'), 'hand');
  assert.equal(normalizeGrinderDriveType('manual'), 'hand');
  assert.equal(normalizeGrinderDriveType('electric'), 'electric');
  assert.equal(normalizeGrinderDriveType('Electric'), 'electric');
  assert.equal(normalizeGrinderDriveType('hybrid'), 'hybrid');
  assert.equal(normalizeGrinderDriveType('', '1zpresso k-ultra manual grinder'), 'hand');
  assert.equal(normalizeGrinderDriveType('', 'niche zero electric grinder'), 'electric');
  assert.equal(normalizeGrinderDriveType('', 'goat story arco hybrid grinder'), 'hybrid');
  assert.equal(normalizeGrinderDriveType('unknown'), 'unknown');
  assert.equal(normalizeGrinderDriveType('', ''), 'unknown');
});

test('normalizeBurrType correctly identifies burr types', () => {
  assert.equal(normalizeBurrType('conical'), 'conical');
  assert.equal(normalizeBurrType('Conical'), 'conical');
  assert.equal(normalizeBurrType('flat'), 'flat');
  assert.equal(normalizeBurrType('hybrid'), 'hybrid');
  assert.equal(normalizeBurrType('blade'), 'unknown');
  assert.equal(normalizeBurrType(''), 'unknown');
});
