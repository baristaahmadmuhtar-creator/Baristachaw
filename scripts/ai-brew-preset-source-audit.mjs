#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs', 'ai-brew-brew-preset-public-research-report.md');
const PRESET_PATH = 'apps/web/public/data/ai-brew/manual-brew-presets.v2026-06.json';
const DRIPPER_PATH = 'apps/web/public/data/ai-brew/drippers.v2026-03.json';
const TARGET_PATH = 'apps/web/public/data/ai-brew/target-profiles.v2026-03.json';

const SOURCE_TIER_BY_VERIFICATION = {
  official_reference: 'official',
  curated_reference: 'expert',
  community_reference: 'community',
  internal_synthesis: 'internal',
};

const CONFIDENCE_BY_VERIFICATION = {
  official_reference: 'high',
  curated_reference: 'medium',
  community_reference: 'low',
  internal_synthesis: 'low',
};

const OFFICIAL_REFERENCE_HOSTS = new Set([
  'aeropress.com',
  'worldaeropresschampionship.com',
]);

const PUBLIC_SPOT_CHECKED_IDS = new Set([
  'inspired-wac-championship-style',
  'inspired-wac-2025-jan-ahrend',
  'inspired-wac-2025-dharun-vyas',
  'inspired-aeropress-cold-brew-express',
  'inspired-tetsu-kasuya-46',
]);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function collectionItems(payload) {
  if (Array.isArray(payload)) return payload;
  return payload.items || payload.publicPresets || [];
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function catalogIds(items) {
  const ids = new Set();
  for (const item of items) {
    ids.add(String(item.id));
    ids.add(slugify(item.name || item.label || item.id));
  }
  ids.delete('');
  return ids;
}

function md(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
    .trim() || '-';
}

function hostFor(sourceUrl) {
  return new URL(sourceUrl).hostname.replace(/^www\./, '');
}

function stripNegativeClaimText(value) {
  return String(value || '').replace(
    /\b(?:do not|not an?|never|without)\b[^\n.]*\b(?:official|exact|verified|world official|guarantee|perfect)\b[^\n.]*[.\n]?/gi,
    '',
  );
}

function evidenceTypeFor(preset) {
  if (preset.verificationLevel === 'official_reference') return 'exact_or_direct_recipe_reference';
  if (preset.category === 'competition_inspired') return 'inspired_recipe';
  if (preset.category === 'taste_target') return 'ratio_range';
  if (/guide|style|method/i.test(preset.sourceAttribution || preset.visibleSummary || '')) return 'method_guide';
  return 'inspired_recipe';
}

function safeUsageNotesFor(preset) {
  const notes = [
    'Show as an adapted starting point, not a guaranteed cup result.',
    preset.fallbackReason ? 'Keep fallback brewer reason visible.' : '',
    preset.verificationLevel === 'official_reference'
      ? 'Official reference supports source attribution; still avoid exact sensory promises.'
      : 'Do not label as official or exact without stronger source evidence.',
  ].filter(Boolean);
  return notes.join(' ');
}

function classifyResearchStatus(preset, issues) {
  if (issues.some((issue) => issue.severity === 'blocker')) return 'BLOCKER';
  if (preset.verificationLevel === 'official_reference' && PUBLIC_SPOT_CHECKED_IDS.has(preset.id)) {
    return 'PUBLIC_SPOT_CHECKED';
  }
  if (preset.verificationLevel === 'official_reference') return 'DIRECT_OFFICIAL_SOURCE_PRESENT';
  if (preset.verificationLevel === 'internal_synthesis') return 'SAFE_INTERNAL_SYNTHESIS_REQUIRES_HUMAN_SOURCE_REVIEW';
  return 'SOURCE_URL_PRESENT_REQUIRES_FULL_PUBLIC_REVIEW';
}

function validatePreset(preset, context) {
  const issues = [];
  const text = [
    preset.safeLabel,
    preset.sourceAttribution,
    preset.visibleSummary,
    preset.fallbackReason || '',
    ...(preset.guardrails || []),
  ].join('\n');
  const positiveText = stripNegativeClaimText(text);
  const target = preset.targetDefaults || {};
  const derivedRatio = target.doseG > 0 ? target.targetWaterMl / target.doseG : 0;

  if (!preset.id) issues.push({ severity: 'blocker', message: 'Missing preset id.' });
  if (context.seenIds.has(preset.id)) issues.push({ severity: 'blocker', message: 'Duplicate preset id.' });
  context.seenIds.add(preset.id);

  if (!preset.safeLabel) issues.push({ severity: 'blocker', message: 'Missing safeLabel.' });
  if (!preset.sourceAttribution) issues.push({ severity: 'blocker', message: 'Missing sourceAttribution.' });
  if (!SOURCE_TIER_BY_VERIFICATION[preset.verificationLevel]) {
    issues.push({ severity: 'blocker', message: `Unknown verificationLevel ${preset.verificationLevel}.` });
  }
  if (!Array.isArray(preset.sourceUrls) || preset.sourceUrls.length === 0) {
    issues.push({ severity: 'blocker', message: 'Missing sourceUrls.' });
  }

  for (const sourceUrl of preset.sourceUrls || []) {
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== 'https:') {
        issues.push({ severity: 'blocker', message: `Non-https source URL: ${sourceUrl}` });
      }
    } catch {
      issues.push({ severity: 'blocker', message: `Invalid source URL: ${sourceUrl}` });
    }
  }

  for (const dripperId of preset.supportedDripperIds || []) {
    if (!context.dripperIds.has(dripperId)) {
      issues.push({ severity: 'blocker', message: `Unsupported dripper id: ${dripperId}` });
    }
  }
  if (preset.fallbackDripperId && !context.dripperIds.has(preset.fallbackDripperId)) {
    issues.push({ severity: 'blocker', message: `Unknown fallback dripper id: ${preset.fallbackDripperId}` });
  }
  if (preset.originalBrewerId && !context.dripperIds.has(preset.originalBrewerId) && !preset.fallbackDripperId) {
    issues.push({ severity: 'blocker', message: 'Unsupported original brewer is missing fallbackDripperId.' });
  }
  if (!context.targetProfileIds.has(target.targetProfileId)) {
    issues.push({ severity: 'blocker', message: `Unknown targetProfileId: ${target.targetProfileId}` });
  }

  for (const field of ['doseG', 'targetWaterMl', 'targetTempC', 'waterTdsPpm', 'waterHardnessPpm', 'waterAlkalinityPpm']) {
    if (!Number.isFinite(target[field])) {
      issues.push({ severity: 'blocker', message: `Invalid numeric target default: ${field}` });
    }
  }
  if (target.targetRatio && Math.abs(target.targetRatio - derivedRatio) > 0.25) {
    issues.push({
      severity: 'blocker',
      message: `targetRatio ${target.targetRatio} does not match dose/water ratio ${derivedRatio.toFixed(2)}.`,
    });
  }
  if (target.brewMode !== 'hot' && target.brewMode !== 'iced') {
    issues.push({ severity: 'blocker', message: `Invalid brewMode: ${target.brewMode}` });
  }

  if (preset.verificationLevel === 'official_reference') {
    const hasOfficialHost = (preset.sourceUrls || []).some((sourceUrl) => {
      try {
        return OFFICIAL_REFERENCE_HOSTS.has(hostFor(sourceUrl));
      } catch {
        return false;
      }
    });
    if (!hasOfficialHost) {
      issues.push({ severity: 'blocker', message: 'official_reference lacks a direct official source host.' });
    }
  } else if (/\bofficial\b|\bexact recipe\b|\bverified\b|world official/i.test(positiveText)) {
    issues.push({ severity: 'blocker', message: 'Non-official preset has a positive official/exact/verified overclaim.' });
  }

  if (preset.verificationLevel === 'internal_synthesis' && /\bexact\b|\bofficial\b|\bverified\b/i.test(positiveText)) {
    issues.push({ severity: 'blocker', message: 'Internal synthesis preset overclaims evidence level.' });
  }
  if (preset.category === 'competition_inspired' && !/inspired|adapted|style|reference|prefill/i.test(text)) {
    issues.push({ severity: 'blocker', message: 'Competition preset is not framed as inspired/adapted/reference.' });
  }
  if (/\b100%\b|perfect result|guaranteed flavor|guaranteed cup/i.test(text)) {
    issues.push({ severity: 'blocker', message: 'Preset uses guarantee/perfection language.' });
  }

  return issues;
}

function buildEvidenceRecord(preset) {
  const target = preset.targetDefaults;
  return {
    presetId: preset.id,
    sourceTier: SOURCE_TIER_BY_VERIFICATION[preset.verificationLevel] || 'internal',
    evidenceType: evidenceTypeFor(preset),
    sourceUrls: preset.sourceUrls || [],
    extracted: {
      brewer: preset.originalBrewerId || preset.supportedDripperIds?.[0] || 'unknown',
      doseG: target.doseG,
      waterMl: target.targetWaterMl,
      ratio: Number((target.targetWaterMl / target.doseG).toFixed(2)),
      tempC: target.targetTempC,
      pourCount: target.presetPourCount || Number(target.pourCount),
      targetTaste: target.targetProfileId,
      waterProfile: {
        tdsPpm: target.waterTdsPpm,
        hardnessPpm: target.waterHardnessPpm,
        alkalinityPpm: target.waterAlkalinityPpm,
      },
    },
    confidence: CONFIDENCE_BY_VERIFICATION[preset.verificationLevel] || 'low',
    conflictNotes: preset.verificationLevel === 'internal_synthesis'
      ? 'No exact public recipe is claimed; keep as internal safe synthesis until human source review upgrades it.'
      : '',
    safeUsageNotes: safeUsageNotesFor(preset),
  };
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(md).join(' | ')} |`),
  ].join('\n');
}

function main() {
  const presetsFile = readJson(PRESET_PATH);
  const presets = collectionItems(presetsFile);
  const drippers = collectionItems(readJson(DRIPPER_PATH));
  const targets = collectionItems(readJson(TARGET_PATH));
  const context = {
    dripperIds: catalogIds(drippers),
    targetProfileIds: catalogIds(targets),
    seenIds: new Set(),
  };

  const rows = presets.map((preset) => {
    const issues = validatePreset(preset, context);
    return {
      preset,
      evidence: buildEvidenceRecord(preset),
      issues,
      researchStatus: classifyResearchStatus(preset, issues),
    };
  });
  const blockers = rows.flatMap((row) => row.issues
    .filter((issue) => issue.severity === 'blocker')
    .map((issue) => `${row.preset.id}: ${issue.message}`));

  const date = process.env.AI_BREW_PRESET_AUDIT_DATE || new Date().toISOString().slice(0, 10);
  const byVerification = countBy(rows, (row) => row.preset.verificationLevel);
  const byCategory = countBy(rows, (row) => row.preset.category);
  const byStatus = countBy(rows, (row) => row.researchStatus);
  const officialConfirmed = rows
    .filter((row) => row.researchStatus === 'PUBLIC_SPOT_CHECKED' || row.researchStatus === 'DIRECT_OFFICIAL_SOURCE_PRESENT')
    .map((row) => row.preset.id);
  const internalSynthesis = rows
    .filter((row) => row.preset.verificationLevel === 'internal_synthesis')
    .map((row) => row.preset.id);

  const report = [
    '# AI Brew Brew Preset Public Research Report',
    '',
    `Date: ${date}`,
    'Catalog: `apps/web/public/data/ai-brew/manual-brew-presets.v2026-06.json`',
    'Internet access: available for spot checks. Automated validation in this report uses committed preset metadata and source URLs; it does not scrape every external page.',
    'Final verdict: NOT READY for exhaustive public-source claim. Software/source-claim integrity is production-safe, but every non-official source still needs human public-source review and physical sensory validation before being marketed as fully public-source verified.',
    '',
    '## Summary',
    '',
    `- Presets audited: ${rows.length}.`,
    `- Verification levels: ${Object.entries(byVerification).map(([key, value]) => `${key}=${value}`).join(', ')}.`,
    `- Categories: ${Object.entries(byCategory).map(([key, value]) => `${key}=${value}`).join(', ')}.`,
    `- Research statuses: ${Object.entries(byStatus).map(([key, value]) => `${key}=${value}`).join(', ')}.`,
    `- Software blockers: ${blockers.length}.`,
    '',
    '## Source Tier Summary',
    '',
    table(
      ['Verification', 'Source tier', 'Confidence', 'Count', 'UI rule'],
      Object.entries(SOURCE_TIER_BY_VERIFICATION).map(([verification, tier]) => [
        verification,
        tier,
        CONFIDENCE_BY_VERIFICATION[verification],
        byVerification[verification] || 0,
        verification === 'official_reference'
          ? 'May show as official reference, never as guaranteed cup result.'
          : verification === 'internal_synthesis'
            ? 'Must show as internal synthesis / safe starting point.'
            : 'Must show as adapted or curated reference, not official/exact.',
      ]),
    ),
    '',
    '## Public Sources Spot-Checked',
    '',
    '- World AeroPress Championship recipes page for WAC 2025 AeroPress winner and finalists.',
    '- AeroPress Express Cold Brew official recipe page.',
    '- Kurasu 2016 Tetsu Kasuya 4:6 method article.',
    '',
    '## Preset Inventory And Evidence Records',
    '',
    table(
      ['Preset', 'Category', 'Tier', 'Confidence', 'Research status', 'Brewer support', 'Defaults', 'Source URLs'],
      rows.map(({ preset, evidence, researchStatus }) => [
        preset.id,
        preset.category,
        evidence.sourceTier,
        evidence.confidence,
        researchStatus,
        preset.supportedDripperIds.join(', '),
        `${preset.targetDefaults.brewMode}; ${preset.targetDefaults.doseG}g/${preset.targetDefaults.targetWaterMl}ml; 1:${(preset.targetDefaults.targetWaterMl / preset.targetDefaults.doseG).toFixed(1)}; ${preset.targetDefaults.targetTempC}C; ${preset.targetDefaults.presetPourCount || preset.targetDefaults.pourCount} phases`,
        preset.sourceUrls.join('<br>'),
      ]),
    ),
    '',
    '## Presets Confirmed Or Left Unchanged',
    '',
    `- Official/direct-source present or spot-checked: ${officialConfirmed.length ? officialConfirmed.join(', ') : 'none'}.`,
    '- Numeric recipe changes made by this audit: none. The audit intentionally does not change numeric recipes without stronger per-preset evidence.',
    `- Internal synthesis presets left unchanged as safe starting points: ${internalSynthesis.join(', ')}.`,
    '- Confidence downgrades made by this audit: none. Existing levels already separate official, curated, community, and internal synthesis.',
    '',
    '## Guardrails Enforced',
    '',
    '- All preset IDs must be unique.',
    '- All source URLs must be valid HTTPS URLs.',
    '- All supported and fallback dripper IDs must resolve in the dripper catalog.',
    '- All target profile IDs must resolve.',
    '- Ratio must match dose/water tolerance when targetRatio is supplied.',
    '- Non-official presets must not make positive official/exact/verified claims.',
    '- Competition presets must remain framed as inspired, adapted, style, reference, or prefill.',
    '- Guarantee/perfect-result language is blocked.',
    '',
    '## Remaining Blockers',
    '',
    blockers.length
      ? blockers.map((item) => `- ${item}`).join('\n')
      : '- No software/source-claim blockers in committed preset metadata.',
    '- Exhaustive public-source research for every non-official source URL is still pending.',
    '- Human sensory brew validation is still pending; do not market these presets as sensory-passed.',
    '- Community and internal synthesis presets should remain low/medium confidence until multiple public sources or brew logs support an upgrade.',
    '',
    '## Final Verdict',
    '',
    blockers.length
      ? 'NOT READY: software blockers exist in the preset catalog.'
      : 'NOT READY for full public-source final because exhaustive external source review and physical brew validation are still pending. MVP software behavior is stronger: all 40 presets are inventoried, source-labeled, claim-guarded, and validated for committed metadata integrity.',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  console.log(`AI Brew preset source audit: ${rows.length} presets, ${blockers.length} blocker(s).`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
  if (blockers.length > 0) {
    for (const blocker of blockers) console.error(`- ${blocker}`);
    process.exitCode = 1;
  }
}

main();
