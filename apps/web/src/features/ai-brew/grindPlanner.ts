import { roundTo } from '../barista-tools/calculations.ts';
import type { GrindBias, RoastLevel } from '../barista-tools/types.ts';
import type {
  AiBrewCatalog,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  ParsedNumericRange,
} from './types.ts';

function normalizeSearchHaystack(parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function haystackHasAny(haystack: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(haystack));
}

function adjustRange(parsed: ParsedNumericRange, bias: GrindBias, roastLevel: RoastLevel, brewMode: 'hot' | 'iced') {
  const center = (parsed.min + parsed.max) / 2;
  const span = Math.max(0.25, parsed.max - parsed.min);
  const roastShift = roastLevel === 'light' ? -0.08 : roastLevel === 'dark' ? 0.08 : 0;
  const brewShift = brewMode === 'iced' ? -0.05 : 0;
  const biasShift = bias === 'finer' ? -0.12 : bias === 'coarser' ? 0.12 : 0;
  const nextCenter = center + span * (roastShift + brewShift + biasShift);
  const halfSpan = Math.max(parsed.precision > 0 ? 0.12 : 1.5, span * 0.2);
  return {
    min: roundTo(nextCenter - halfSpan, parsed.precision),
    max: roundTo(nextCenter + halfSpan, parsed.precision),
  };
}

function isFeimaStyleGrinder(grinder: EquipmentCatalogEntry) {
  const haystack = normalizeSearchHaystack([
    grinder.id,
    grinder.name,
    grinder.brand,
    grinder.typeLabel,
    grinder.searchText,
  ]);
  return haystackHasAny(haystack, [/\b600n\b/i, /\bfeima\b/i, /\blatina\b/i, /\bflying eagle\b/i]);
}

function formatParsedSetting(value: number, parsed: ParsedNumericRange) {
  const rounded = roundTo(value, parsed.precision);
  const text = parsed.precision > 0 ? rounded.toFixed(parsed.precision) : String(Math.round(rounded));
  return `${text} ${parsed.unitLabel}`.trim();
}

export function formatGrindRecommendation(params: {
  primary: string;
  lowerCorrection?: string;
  upperCorrection?: string;
}) {
  return {
    headline: `Starting grind: ${params.primary}`,
    correction:
      `If sour/thin: ${params.lowerCorrection || 'slightly finer'}. `
      + `If bitter/dry/stalled: ${params.upperCorrection || 'slightly coarser'}.`,
  };
}

export function resolveGrinderSettingReference(
  catalog: AiBrewCatalog,
  grinder: EquipmentCatalogEntry,
  deviceProfile: DeviceBrewProfile,
  brewMode: 'hot' | 'iced',
) {
  const modeMatch = (entry: GrinderSettingReference) => entry.brewMode === brewMode || entry.brewMode === 'both';
  const exact = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.includes(deviceProfile.id),
  );
  if (exact) return exact;

  const familyIds = catalog.deviceProfiles
    .filter((entry) => !entry.exactMatch && entry.methodFamily === deviceProfile.methodFamily && entry.brewMode === brewMode)
    .map((entry) => entry.id);

  const familySetting = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.some((profileId) => familyIds.includes(profileId)),
  );
  if (familySetting) return familySetting;

  const baseline = grinder.grindBands?.medium?.trim();
  if (!baseline) return undefined;

  const hasCatalogBandProvenance = grinder.sourceUrls.length > 0
    && grinder.verificationLevel !== 'dataset_unverified'
    && grinder.verificationLevel !== 'fallback';

  return {
    id: `${hasCatalogBandProvenance ? 'catalog' : 'derived'}_${grinder.id}_${brewMode}`,
    grinderId: grinder.id,
    brewMode,
    profileIds: [],
    rangeLabel: baseline,
    parsedRange: grinder.grindBands?.parsedMedium || null,
    note: hasCatalogBandProvenance
      ? 'No profile-specific grinder chart is stored yet; using this grinder published pour-over band as the deterministic baseline.'
      : 'No profile-specific grinder chart found; using this grinder medium filter band as deterministic baseline.',
    source: hasCatalogBandProvenance ? 'catalog_pour_over_band' : 'derived_from_grinder_band',
    sourceUrls: grinder.sourceUrls,
    verificationLevel: hasCatalogBandProvenance ? grinder.verificationLevel : 'fallback',
    verifiedAt: hasCatalogBandProvenance ? grinder.verifiedAt : catalog.catalogVersion,
    popularityTier: grinder.popularityTier,
    marketSegment: grinder.marketSegment,
    releaseStatus: grinder.releaseStatus,
    confidence: hasCatalogBandProvenance ? grinder.confidence : 'low',
    catalogVersion: catalog.catalogVersion,
  } satisfies GrinderSettingReference;
}

export function buildGrindRecommendation(
  grinder: EquipmentCatalogEntry,
  setting: GrinderSettingReference | undefined,
  grindBias: GrindBias,
  roastLevel: RoastLevel,
  brewMode: 'hot' | 'iced',
) {
  if (setting?.parsedRange) {
    const adjusted = adjustRange(setting.parsedRange, grindBias, roastLevel, brewMode);
    if (isFeimaStyleGrinder(grinder)) {
      const recommendation = formatGrindRecommendation({
        primary: 'setting 4-5',
        lowerCorrection: 'setting 4-4',
        upperCorrection: 'setting 5-0',
      });
      return {
        grindBandLabel: setting.rangeLabel,
        grindRecommendation: `${recommendation.headline}. Correction range: setting 4-4 to setting 5-0. ${recommendation.correction}`,
        confidenceNotes: [setting.note],
        verificationLevel: setting.verificationLevel,
      };
    }
    const primary = formatParsedSetting((adjusted.min + adjusted.max) / 2, setting.parsedRange);
    const recommendation = formatGrindRecommendation({
      primary,
      lowerCorrection: formatParsedSetting(adjusted.min, setting.parsedRange),
      upperCorrection: formatParsedSetting(adjusted.max, setting.parsedRange),
    });
    return {
      grindBandLabel: setting.rangeLabel,
      grindRecommendation: `${recommendation.headline}. Correction range: ${formatParsedSetting(adjusted.min, setting.parsedRange)} to ${formatParsedSetting(adjusted.max, setting.parsedRange)}. ${recommendation.correction}`,
      confidenceNotes: [setting.note],
      verificationLevel: setting.verificationLevel,
    };
  }

  if (setting) {
    const recommendation = formatGrindRecommendation({ primary: setting.rangeLabel });
    return {
      grindBandLabel: setting.rangeLabel,
      grindRecommendation: `${recommendation.headline}. ${recommendation.correction}${grindBias === 'same' ? '' : ` Bias ${grindBias}.`}`,
      confidenceNotes: [setting.note],
      verificationLevel: setting.verificationLevel,
    };
  }

  const baseline = grinder.grindBands?.medium || grinder.typeLabel;
  return {
    grindBandLabel: baseline || 'No verified setting yet',
    grindRecommendation: `No verified setting yet. Start near ${baseline || "your grinder's medium filter range"} and bias ${grindBias}.`,
    confidenceNotes: ['No verified grinder setting is stored for this grinder and brew family yet.'],
    verificationLevel: 'fallback' as const,
  };
}
