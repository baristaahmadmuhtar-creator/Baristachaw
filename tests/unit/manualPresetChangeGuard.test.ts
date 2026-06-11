import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveManualPresetChange } from '../../apps/web/src/features/ai-brew/manualPresetChangeGuard.ts';

test('changing target profile while a manual preset is active requires confirmation', () => {
  const result = resolveManualPresetChange({
    activePresetId: 'preset-1',
    key: 'targetProfileId',
    value: 'more_sweetness',
  });

  assert.equal(result.kind, 'confirm_exit');
});

test('changing brewer while a manual preset is active requires confirmation', () => {
  const result = resolveManualPresetChange({
    activePresetId: 'preset-1',
    key: 'dripperId',
    value: 'chemex',
  });

  assert.equal(result.kind, 'confirm_exit');
});

test('coffee metadata changes do not detach the selected preset', () => {
  const result = resolveManualPresetChange({
    activePresetId: 'preset-1',
    key: 'coffeeName',
    value: 'Ethiopia',
  });

  assert.equal(result.kind, 'apply');
  if (result.kind === 'apply') assert.equal(result.clearPreset, false);
});
