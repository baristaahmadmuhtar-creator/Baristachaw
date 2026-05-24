import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeZoomableViewportContent } from '../../apps/web/src/hooks/usePinchZoomLock.ts';

test('normalizeZoomableViewportContent removes mobile zoom blockers', () => {
  const normalized = normalizeZoomableViewportContent(
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
  );

  assert.match(normalized, /width=device-width/);
  assert.match(normalized, /viewport-fit=cover/);
  assert.match(normalized, /interactive-widget=resizes-content/);
  assert.doesNotMatch(normalized, /maximum-scale/i);
  assert.doesNotMatch(normalized, /user-scalable/i);
});
