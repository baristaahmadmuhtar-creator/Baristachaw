import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildWaterCoffeeParameters,
  calculateAlkalinityPpmAsCaco3,
  calculateHardnessPpmAsCaco3,
} from '../../lib/catalog/metrics.ts';
import { buildCatalogArtifacts } from '../../lib/catalog/build.ts';
import { searchCatalog } from '../../lib/catalog/search.ts';
import { persistCatalogSuggestion } from '../../lib/catalog/suggestions.ts';
import type { CatalogState, DripperRecord, GrinderRecord, WaterRecord } from '../../lib/catalog/types.ts';

const waterFixture: WaterRecord = {
  id: 'volvic-fr',
  brand: 'Volvic',
  country_origin: 'France',
  available_in: ['Singapore', 'Malaysia'],
  water_type: 'natural_mineral',
  is_sparkling: false,
  minerals_mg_l: {
    calcium: 12,
    magnesium: 8,
    sodium: 12,
    potassium: 6,
    bicarbonate: 74,
    sulfate: null,
    chloride: null,
    silica: null,
  },
  ph: 7,
  tds_ppm: 109,
  coffee_parameters: buildWaterCoffeeParameters({
    minerals_mg_l: {
      calcium: 12,
      magnesium: 8,
      sodium: 12,
      potassium: 6,
      bicarbonate: 74,
      sulfate: null,
      chloride: null,
      silica: null,
    },
    ph: 7,
    tds_ppm: 109,
    is_sparkling: false,
  }),
  sources: [{
    source_type: 'label',
    source_url: 'https://example.com/volvic',
    collected_at: '2026-03-10T00:00:00.000Z',
    confidence_score: 0.95,
  }],
  primary_source: {
    source_type: 'label',
    source_url: 'https://example.com/volvic',
    collected_at: '2026-03-10T00:00:00.000Z',
    confidence_score: 0.95,
  },
  published: true,
  search_text: 'volvic france water singapore malaysia',
  aliases: ['Volvic'],
  verification_status: 'verified',
  data_quality: {
    is_estimated: false,
    missing_fields: [],
    completeness_score: 100,
  },
  updated_at: '2026-03-10T00:00:00.000Z',
};

const dripperFixture: DripperRecord = {
  id: 'origami-air-s',
  brand: 'ORIGAMI',
  model: 'Air S',
  material: 'plastic',
  geometry: 'conical',
  hole_count: null,
  rib_type: null,
  filter_type: 'paper',
  capacity_cups: null,
  brew_style_notes: 'Cone dripper',
  available_in: ['Global'],
  sources: [{
    source_type: 'brand_site',
    source_url: 'https://origami-kai.com/en/products/origami_dripperair_s',
    collected_at: '2026-03-10T00:00:00.000Z',
    confidence_score: 0.95,
  }],
  primary_source: {
    source_type: 'brand_site',
    source_url: 'https://origami-kai.com/en/products/origami_dripperair_s',
    collected_at: '2026-03-10T00:00:00.000Z',
    confidence_score: 0.95,
  },
  source_type: 'brand_site',
  confidence_score: 0.95,
  published: true,
  search_text: 'origami air s conical dripper',
  aliases: ['Origami Air S'],
  verification_status: 'verified',
  data_quality: {
    is_estimated: false,
    missing_fields: [],
    completeness_score: 92,
  },
  updated_at: '2026-03-10T00:00:00.000Z',
};

const grinderFixture: GrinderRecord = {
  id: 'timemore-c5',
  brand: 'TIMEMORE',
  model: 'Chestnut C5 Pro',
  grinder_type: 'hand',
  burr_type: null,
  burr_material: null,
  burr_size_mm: null,
  step_type: 'stepped',
  recommended_range: {
    espresso: 'Official stepped settings',
    pour_over: 'Official stepped settings',
    french_press: 'Official stepped settings',
  },
  retention_notes: 'Use official chart.',
  available_in: ['Global'],
  sources: [{
    source_type: 'brand_site',
    source_url: 'https://www.timemore.com/es/products/timemore-manual-coffee-grinder-chestnut-c5-series',
    collected_at: '2026-03-10T00:00:00.000Z',
    confidence_score: 0.95,
  }],
  primary_source: {
    source_type: 'brand_site',
    source_url: 'https://www.timemore.com/es/products/timemore-manual-coffee-grinder-chestnut-c5-series',
    collected_at: '2026-03-10T00:00:00.000Z',
    confidence_score: 0.95,
  },
  source_type: 'brand_site',
  confidence_score: 0.95,
  published: true,
  search_text: 'timemore chestnut c5 pro grinder',
  aliases: ['TIMEMORE Chestnut C5 Pro'],
  verification_status: 'verified',
  data_quality: {
    is_estimated: false,
    missing_fields: [],
    completeness_score: 88,
  },
  updated_at: '2026-03-10T00:00:00.000Z',
};

test('water hardness and alkalinity formulas follow the catalog policy', () => {
  assert.equal(calculateHardnessPpmAsCaco3(12, 8), 62.8);
  assert.equal(calculateAlkalinityPpmAsCaco3(74), 60.7);
});

test('water coffee parameters produce a usable SCA score without fabrication', () => {
  assert.equal(waterFixture.coffee_parameters.hardness_ppm_as_caco3, 62.8);
  assert.equal(waterFixture.coffee_parameters.alkalinity_ppm_as_caco3, 60.7);
  assert.equal(waterFixture.coffee_parameters.brew_recommendation, 'excellent');
  assert.ok((waterFixture.coffee_parameters.sca_match_score || 0) >= 90);
});

test('search catalog prioritizes exact published matches and region relevance', () => {
  const result = searchCatalog([waterFixture], 'Singapore', 'volvic', 10);
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'volvic-fr');
  assert.equal(result.suggestions[0]?.id, 'volvic-fr');
});

test('search catalog falls back to review queue only after published results are exhausted', () => {
  const reviewOnly: DripperRecord = {
    ...dripperFixture,
    id: 'review-dripper',
    brand: 'Latina',
    model: 'Prototype',
    published: false,
    verification_status: 'review_required',
    data_quality: {
      is_estimated: true,
      missing_fields: ['sources'],
      completeness_score: 20,
    },
    sources: [],
    primary_source: null,
    search_text: 'latina prototype dripper',
    aliases: ['Latina Prototype'],
  };

  const result = searchCatalog([reviewOnly], 'Indonesia', 'latina', 10);
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'review-dripper');
  assert.equal(result.can_request_ai_research, true);
});

test('catalog build artifacts produce search exports and report counters', () => {
  const catalog: CatalogState = {
    version: 'test-phase1',
    waters: [waterFixture],
    drippers: [dripperFixture],
    grinders: [grinderFixture],
  };
  const artifacts = buildCatalogArtifacts(catalog);
  assert.equal(artifacts.waterSearch.length, 1);
  assert.equal(artifacts.dripperSearch.length, 1);
  assert.equal(artifacts.grinderSearch.length, 1);
  assert.equal(artifacts.report.waters.by_country.France, 1);
  assert.equal(artifacts.report.drippers.by_brand.ORIGAMI, 1);
});

test('catalog suggestions persist to the configured log file', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'baristaclaw-catalog-'));
  const tempFile = path.join(tempDir, 'suggestions.ndjson');
  process.env.CATALOG_SUGGESTION_LOG_PATH = tempFile;

  const record = await persistCatalogSuggestion({
    kind: 'water',
    brand: 'Volvic',
    region: 'Singapore',
  });

  const raw = await readFile(tempFile, 'utf8');
  assert.match(raw, /Volvic/);
  assert.equal(record.kind, 'water');
  assert.equal(record.region, 'Singapore');

  delete process.env.CATALOG_SUGGESTION_LOG_PATH;
});
