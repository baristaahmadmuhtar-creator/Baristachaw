import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const TOOLS_SOURCE = readFileSync('apps/web/src/pages/BaristaTools.tsx', 'utf8');
const HOME_SOURCE = readFileSync('apps/web/src/pages/Home.tsx', 'utf8');
const CONSTANTS_SOURCE = readFileSync('apps/web/src/constants.ts', 'utf8');

test('Home grinder card deep links directly to the grind-size tools panel', () => {
  assert.match(HOME_SOURCE, /to="\/tools\?tab=ratio&panel=grind-size"/);
  assert.match(TOOLS_SOURCE, /const PANEL_QUERY_KEY = 'panel'/);
  assert.match(TOOLS_SOURCE, /function parseCalculatorPanel/);
  assert.match(TOOLS_SOURCE, /searchParams\.get\(PANEL_QUERY_KEY\)/);
  assert.match(TOOLS_SOURCE, /searchParams\.get\(TAB_QUERY_KEY\) === 'grind-size'/);
  assert.match(TOOLS_SOURCE, /nextParams\.set\(PANEL_QUERY_KEY, serializeCalculatorPanel\(panel\)\)/);
  assert.match(CONSTANTS_SOURCE, /Find a method-aware starting grind, then adjust by brew time and taste\./);
  assert.match(CONSTANTS_SOURCE, /Cari titik awal gilingan sesuai metode, lalu koreksi dari waktu seduh dan rasa\./);
});
