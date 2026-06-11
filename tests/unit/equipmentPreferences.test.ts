import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEquipmentPreferencesToForm,
  normalizeEquipmentPreferences,
  sortEquipmentByPreference,
} from '../../apps/web/src/services/equipmentPreferences.ts';

test('equipment preferences normalize catalog and manual choices safely', () => {
  const preferences = normalizeEquipmentPreferences({
    completedAt: 123,
    preferredDripperId: ' hario-v60 ',
    preferredGrinderId: 'timemore-c3',
    customDripperName: '  My Brewer  ',
    customGrinderName: '',
  });

  assert.equal(preferences.preferredDripperId, 'hario-v60');
  assert.equal(preferences.customDripperName, 'My Brewer');
  assert.equal(preferences.customGrinderName, undefined);
});

test('equipment preferences move favorites to the top without removing catalog items', () => {
  const items = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ];

  const sorted = sortEquipmentByPreference(items, 'b');
  assert.deepEqual(sorted.map((item) => item.id), ['b', 'a', 'c']);
  assert.deepEqual(items.map((item) => item.id), ['a', 'b', 'c']);
});

test('equipment preferences seed AI Brew only when matching catalog records exist', () => {
  const form = { dripperId: 'a', grinderId: 'x', coffeeName: '' };
  const result = applyEquipmentPreferencesToForm(form, {
    preferredDripperId: 'b',
    preferredGrinderId: 'y',
    completedAt: 123,
  }, {
    dripperIds: new Set(['a', 'b']),
    grinderIds: new Set(['x']),
  });

  assert.equal(result.dripperId, 'b');
  assert.equal(result.grinderId, 'x');
});
