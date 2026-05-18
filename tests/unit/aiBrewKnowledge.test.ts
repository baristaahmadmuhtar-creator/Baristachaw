import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAiBrewKnowledgeContext,
  resolveAiBrewKnowledgeNotes,
} from '../../apps/web/src/features/ai-brew/knowledge.ts';

test('AI Brew knowledge resolves layered professional brewing context', () => {
  const notes = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Aceh Gayo wet-hulled smoky cup',
    dripperName: 'Hario Switch 03',
    methodFamily: 'hario_switch',
    process: 'wet-hulled',
    variety: 'TimTim S795',
  });

  assert.ok(notes.length >= 4, 'Expected origin, hardware, process, sensory, and variety knowledge to resolve');
  assert.ok(notes.some((note) => /Hario Switch/i.test(note)), 'Switch hardware guidance should resolve');
  assert.ok(notes.some((note) => /Wet-hulled/i.test(note)), 'Wet-hulled process guidance should resolve');
  assert.ok(notes.some((note) => /Gayo/i.test(note)), 'Gayo origin guidance should resolve');
  assert.ok(notes.some((note) => /Woody\/smoky|smoky/i.test(note)), 'Smoky/roasty sensory guidance should resolve');
});

test('AI Brew knowledge normalizes aliases and caps prompt-safe output', () => {
  const notes = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Ethiopia Yirgacheffe anaerobic natural co-ferment sour flat batch',
    dripperName: 'HARIO_V60 Chemex AeroPress Espresso Kalita Wave Cold Brew',
    methodFamily: 'v60',
    process: 'fully_washed carbonic maceration high-buffer low-mineral bloom agitation',
    variety: 'Gesha SL28 bourbon robusta liberica',
  });

  assert.equal(notes.length, 8, 'Knowledge output should stay capped for prompt budget safety');
  assert.ok(notes.some((note) => /V60/i.test(note)), 'Method aliases should normalize underscores and casing');
  assert.ok(notes.some((note) => /Co-ferment|co-ferment/i.test(note)), 'Co-ferment alias should resolve');
  assert.ok(notes.some((note) => /Espresso/i.test(note)), 'High-priority professional hardware guidance should survive the cap');
});

test('AI Brew knowledge context formats notes or none deterministically', () => {
  assert.equal(formatAiBrewKnowledgeContext({}), 'none');

  const context = formatAiBrewKnowledgeContext({
    dripperName: 'Moka Pot',
    process: 'decaf',
  });

  assert.match(context, /Moka Pot/);
  assert.match(context, /Decaf/);
  assert.match(context, / \| /, 'Multiple notes should be pipe-separated for compact planner prompts');
});
