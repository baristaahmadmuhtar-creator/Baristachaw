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

  assert.ok(notes.length >= 7, 'Expected origin, hardware, process, sensory, variety, and universal knowledge to resolve');
  assert.ok(notes.some((note) => /Hario Switch/i.test(note)), 'Switch hardware guidance should resolve');
  assert.ok(notes.some((note) => /Wet-hulled/i.test(note)), 'Wet-hulled process guidance should resolve');
  assert.ok(notes.some((note) => /Gayo/i.test(note)), 'Gayo origin guidance should resolve');
  assert.ok(notes.some((note) => /Woody\/smoky|smoky/i.test(note)), 'Smoky/roasty sensory guidance should resolve');
  assert.ok(notes.some((note) => /Universal bean safety/i.test(note)), 'Universal bean safety should always be present when input exists');
  assert.ok(notes.some((note) => /Universal dial-in/i.test(note)), 'Universal one-variable dial-in should always be present when input exists');
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
  assert.match(context, /Universal dial-in/);
  assert.match(context, / \| /, 'Multiple notes should be pipe-separated for compact planner prompts');
});

test('AI Brew knowledge gives safe fallback for unknown beans and custom user input', () => {
  const notes = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Mystery farmer lot custom roast from a small island',
    process: 'producer special process unknown label',
    variety: 'local cultivar blend',
    methodFamily: 'chemex',
  });

  assert.ok(notes.length >= 3, 'Unknown beans should still get universal safety notes');
  assert.ok(notes.some((note) => /Universal bean safety/i.test(note)));
  assert.ok(notes.some((note) => /Universal dial-in/i.test(note)));
  assert.ok(notes.some((note) => /paper filter|method safety/i.test(note)));
});

test('AI Brew knowledge keeps espresso fallback method-specific and not V60-like', () => {
  const notes = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Unknown espresso blend washed floral',
    methodFamily: 'espresso',
    process: 'washed',
  });

  assert.ok(notes.some((note) => /dose\/yield\/time\/puck prep/i.test(note)));
  assert.ok(notes.every((note) => !/center-to-mid|dinding filter|paper filter|bloom|drawdown|\bbed\b/i.test(note)), 'Espresso fallback must not use pour-over guidance');
});

test('AI Brew knowledge keeps cold brew and moka free from hot pour-over language', () => {
  const cold = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Brazil natural cold brew floral',
    methodFamily: 'cold_brew',
    process: 'natural',
  });
  assert.ok(cold.some((note) => /Cold Brew/i.test(note)));
  assert.ok(cold.every((note) => !/bloom|drawdown|kettle|spiral|hot extraction|ekstraksi panas/i.test(note)), 'Cold Brew knowledge must not use hot pour-over language');

  const moka = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Liberica washed moka',
    methodFamily: 'moka_pot',
    process: 'washed',
    variety: 'liberica',
  });
  assert.ok(moka.some((note) => /Moka Pot/i.test(note)));
  assert.ok(moka.every((note) => !/bloom|drawdown|spiral|paper filter|dinding filter|\bbed\b/i.test(note)), 'Moka knowledge must not use paper-filter workflow language');
});

test('AI Brew knowledge filters method-language leakage across non-pour-over methods', () => {
  const checks = [
    {
      methodFamily: 'french_press' as const,
      coffeeName: 'Ethiopia washed floral V60 bloom drawdown',
      process: 'washed',
      forbidden: /bloom|drawdown|pour spiral|paper filter|dinding filter|\bv60\b/i,
    },
    {
      methodFamily: 'aeropress' as const,
      coffeeName: 'Brazil natural AeroPress V60 drawdown wall-chasing',
      process: 'natural',
      forbidden: /drawdown|wall-chasing|dinding filter|paper filter|v60 spiral/i,
    },
    {
      methodFamily: 'batch_brew' as const,
      coffeeName: 'Colombia washed batch manual pour compact spiral',
      process: 'washed',
      forbidden: /manual pour|center-to-mid|compact spiral|tuang tengah|\bv60\b/i,
    },
  ];

  for (const check of checks) {
    const notes = resolveAiBrewKnowledgeNotes(check);
    assert.ok(notes.length > 0, `${check.methodFamily} should still get safe knowledge notes`);
    assert.ok(
      notes.every((note) => !check.forbidden.test(note)),
      `${check.methodFamily} knowledge must not leak incompatible workflow language`,
    );
  }
});

test('AI Brew knowledge keeps paper-filter language available for paper-filter methods', () => {
  const notes = resolveAiBrewKnowledgeNotes({
    coffeeName: 'Ethiopia washed V60 bloom clarity',
    dripperName: 'Hario V60',
    methodFamily: 'v60',
    process: 'washed',
  });

  assert.ok(notes.some((note) => /V60/i.test(note)), 'V60 method knowledge should resolve');
  assert.ok(notes.some((note) => /bloom|paper filter|bed|flow/i.test(note)), 'Paper-filter cues should remain available for V60');
});
