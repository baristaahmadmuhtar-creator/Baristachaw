import { roundTo } from '../barista-tools/calculations.ts';
import type { GrindBias, RoastLevel } from '../barista-tools/types.ts';
import type {
  AiBrewCatalog,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  AiBrewMethodFamily,
  ParsedNumericRange,
} from './types.ts';

type GrinderBandKey = 'coarse' | 'medium' | 'fine';

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
  const roastShift = roastLevel === 'light'
    ? -0.14
    : roastLevel === 'medium_light'
      ? -0.07
      : roastLevel === 'medium_dark'
        ? 0.07
        : roastLevel === 'dark'
          ? 0.14
          : 0;
  const brewShift = brewMode === 'iced' ? -0.05 : 0;
  const biasShift = bias === 'finer' ? -0.18 : bias === 'coarser' ? 0.18 : 0;
  const nextCenter = center + span * (roastShift + brewShift + biasShift);
  const halfSpan = Math.max(parsed.precision > 0 ? 0.12 : 1.5, span * 0.2);
  return {
    center: roundTo(nextCenter, parsed.precision),
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
  return haystackHasAny(haystack, [/\b600n\b/i, /\bfeima\b/i, /\blatina\b/i, /\bflying eagle\b/i, /\bmurane\b/i, /\bfomac\b/i, /\bkova\b/i]);
}

function isEspressoNotRecommendedGrinder(grinder: EquipmentCatalogEntry) {
  const haystack = normalizeSearchHaystack([
    grinder.id,
    grinder.name,
    grinder.brand,
    grinder.typeLabel,
    grinder.description,
    grinder.searchText,
    grinder.grindBands?.fine,
    grinder.grindBands?.medium,
    grinder.grindBands?.coarse,
  ]);
  return haystackHasAny(haystack, [
    /\btimemore\s*c2\b/i,
    /\btimemore\s*c3\b(?!\s*esp)/i,
    /\btimemore\s*s3\b(?!\s*esp)/i,
    /\bfellow\s*ode\b/i,
    /\bbaratza\s*encore\b(?!\s*esp)/i,
    /\bfeima\b/i,
    /\b600n\b/i,
    /\blatina\b/i,
    /\bflying\s*eagle\b/i,
    /\bmurane\b/i,
    /\bfomac\b/i,
    /\bkova\b/i,
    /\bhario\b/i,
    /\bporlex\b/i,
    /\bq\s*air\b/i,
    /\bq2\b/i,
    /\bzp6\b/i,
    /\bsculptor\s*078\b(?!\s*s)/i,
    /\bbrew[-\s]?focused\b/i,
    /\bunknown\s+manual\b/i,
    /\bunknown\s+electric\b/i,
    /\bfallback\s+manual\b/i,
    /\bfallback\s+electric\b/i,
    /\bmanual\s+calibration\b/i,
  ]);
}

function formatParsedSetting(value: number, parsed: ParsedNumericRange) {
  const rounded = roundTo(value, parsed.precision);
  const text = parsed.precision > 0 ? rounded.toFixed(parsed.precision) : String(Math.round(rounded));
  return `${text} ${parsed.unitLabel}`.trim();
}

function formatFeimaSetting(value: number) {
  const rounded = roundTo(value, 1);
  const text = Number.isInteger(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
  return `setting ${text}`;
}

function isFeimaCuratedConeSetting(setting: GrinderSettingReference) {
  const haystack = normalizeSearchHaystack([setting.id, setting.rangeLabel, setting.note, setting.source]);
  return haystackHasAny(haystack, [
    /\bfeima[_-]600n[_-]cone\b/i,
    /\bcurated cone baseline\b/i,
    /\b3\.5\s*-\s*4\.5\b/i,
  ]);
}

function preferredFallbackBands(methodFamily: AiBrewMethodFamily): GrinderBandKey[] {
  switch (methodFamily) {
    case 'espresso':
    case 'moka_pot':
      return ['fine', 'medium', 'coarse'];
    case 'cold_brew':
    case 'french_press':
    case 'chemex':
      return ['coarse', 'medium', 'fine'];
    case 'aeropress':
    case 'batch_brew':
    case 'siphon':
    case 'clever_dripper':
      return ['medium', 'coarse', 'fine'];
    default:
      return ['medium', 'fine', 'coarse'];
  }
}

function fallbackBandLabel(grinder: EquipmentCatalogEntry, band: GrinderBandKey) {
  return grinder.grindBands?.[band]?.trim() || '';
}

function fallbackBandParsedRange(grinder: EquipmentCatalogEntry, band: GrinderBandKey) {
  if (band === 'coarse') return grinder.grindBands?.parsedCoarse || null;
  if (band === 'fine') return grinder.grindBands?.parsedFine || null;
  return grinder.grindBands?.parsedMedium || null;
}

function selectFallbackGrinderBand(grinder: EquipmentCatalogEntry, methodFamily: AiBrewMethodFamily) {
  const bands = preferredFallbackBands(methodFamily);
  for (const band of bands) {
    const label = fallbackBandLabel(grinder, band);
    if (label) {
      return {
        band,
        label,
        parsedRange: fallbackBandParsedRange(grinder, band),
      };
    }
  }
  return undefined;
}

function formatFallbackBandNote(params: {
  hasCatalogBandProvenance: boolean;
  band: GrinderBandKey;
  methodFamily: AiBrewMethodFamily;
}) {
  const bandLabel = params.band === 'coarse'
    ? 'coarse'
    : params.band === 'fine'
      ? 'fine'
      : 'medium';
  const methodLabel = params.methodFamily.replace(/_/g, ' ');
  if (params.hasCatalogBandProvenance) {
    const pourOverPhrase = params.band === 'medium' ? ' published pour-over band' : ` published ${bandLabel} band`;
    return `No profile-specific grinder chart is stored yet; using this grinder${pourOverPhrase} as a method-aware ${methodLabel} baseline. Calibrate zero point and taste before treating it as exact.`;
  }
  return `No profile-specific grinder chart found; using this grinder ${bandLabel} band as a method-aware ${methodLabel} baseline. Calibrate zero point and taste before treating it as exact.`;
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
  if (deviceProfile.methodFamily === 'french_press') {
    const isDoubleFilter = deviceProfile.recipeStyle === 'double_filter';
    let rangeLabel = '';
    let parsedRange: ParsedNumericRange | null = null;
    let note = '';

    if (grinder.id === 'comandante-c40-mk4') {
      if (isDoubleFilter) {
        rangeLabel = '20 - 25 clicks';
        parsedRange = { min: 20, max: 25, unitLabel: 'clicks', precision: 0 };
        note = 'French Press double filter style calibrated for Comandante C40: 20-25 clicks (medium-fine).';
      } else {
        rangeLabel = '31 - 35 clicks';
        parsedRange = { min: 31, max: 35, unitLabel: 'clicks', precision: 0 };
        note = 'French Press coarse style calibrated for Comandante C40: 31-35 clicks.';
      }
    } else if (grinder.id === 'baratza-encore') {
      if (isDoubleFilter) {
        rangeLabel = '#12 - #15';
        parsedRange = { min: 12, max: 15, unitLabel: 'setting', precision: 0 };
        note = 'French Press double filter style calibrated for Baratza Encore: #12-#15 (medium-fine).';
      } else {
        rangeLabel = '#26 - #32';
        parsedRange = { min: 26, max: 32, unitLabel: 'setting', precision: 0 };
        note = 'French Press coarse style calibrated for Baratza Encore: #26-#32.';
      }
    } else if (grinder.id === 'fellow-ode-gen-2') {
      if (isDoubleFilter) {
        rangeLabel = '3.0 - 5.0';
        parsedRange = { min: 3.0, max: 5.0, unitLabel: '', precision: 1 };
        note = 'French Press double filter style calibrated for Fellow Ode Gen 2: 3.0-5.0 (medium-fine).';
      } else {
        rangeLabel = '8.0 - 11.0';
        parsedRange = { min: 8.0, max: 11.0, unitLabel: '', precision: 1 };
        note = 'French Press coarse style calibrated for Fellow Ode Gen 2: 8.0-11.0.';
      }
    } else if (grinder.id === 'timemore-c2') {
      if (isDoubleFilter) {
        rangeLabel = '16 - 20 clicks';
        parsedRange = { min: 16, max: 20, unitLabel: 'clicks', precision: 0 };
        note = 'French Press double filter style calibrated for Timemore C2: 16-20 clicks (medium-fine).';
      } else {
        rangeLabel = '24 - 28 clicks';
        parsedRange = { min: 24, max: 28, unitLabel: 'clicks', precision: 0 };
        note = 'French Press coarse style calibrated for Timemore C2: 24-28 clicks.';
      }
    }

    if (parsedRange) {
      return {
        id: `calibrated_fp_${grinder.id}_${deviceProfile.id}`,
        grinderId: grinder.id,
        brewMode,
        profileIds: [deviceProfile.id],
        rangeLabel,
        parsedRange,
        note,
        referenceType: 'method_specific_master_table',
        calibrationRequired: false,
        source: 'french_press_style_calibration',
        sourceUrls: grinder.sourceUrls || [],
        verificationLevel: 'curated',
        verifiedAt: '2026-06-04',
        popularityTier: grinder.popularityTier,
        marketSegment: grinder.marketSegment,
        releaseStatus: grinder.releaseStatus,
        confidence: 'high',
        catalogVersion: catalog.catalogVersion,
      } satisfies GrinderSettingReference;
    }
  }

  const modeMatch = (entry: GrinderSettingReference) => entry.brewMode === brewMode || entry.brewMode === 'both';
  const espressoNotRecommended = deviceProfile.methodFamily === 'espresso'
    && isEspressoNotRecommendedGrinder(grinder);
  const exact = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.includes(deviceProfile.id),
  );
  if (exact && !espressoNotRecommended) return exact;

  const familyIds = catalog.deviceProfiles
    .filter((entry) => !entry.exactMatch && entry.methodFamily === deviceProfile.methodFamily && entry.brewMode === brewMode)
    .map((entry) => entry.id);

  const familySetting = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.some((profileId) => familyIds.includes(profileId)),
  );
  if (familySetting && !espressoNotRecommended) return familySetting;

  const fallbackBand = selectFallbackGrinderBand(grinder, deviceProfile.methodFamily);
  if (!fallbackBand) return undefined;

  const hasCatalogBandProvenance = grinder.sourceUrls.length > 0
    && grinder.verificationLevel !== 'dataset_unverified'
    && grinder.verificationLevel !== 'fallback';
  const idSuffix = deviceProfile.methodFamily === 'v60'
    ? brewMode
    : `${deviceProfile.methodFamily}_${brewMode}`;
  const note = formatFallbackBandNote({
    hasCatalogBandProvenance,
    band: fallbackBand.band,
    methodFamily: deviceProfile.methodFamily,
  }) + (espressoNotRecommended
    ? ' Hard warning: this grinder is not recommended for espresso because a safe espresso/fine range is not verified; choose an espresso-capable grinder for real shots.'
    : '');

  return {
    id: `${hasCatalogBandProvenance ? 'catalog' : 'derived'}_${grinder.id}_${idSuffix}`,
    grinderId: grinder.id,
    brewMode,
    profileIds: [],
    rangeLabel: fallbackBand.label,
    parsedRange: fallbackBand.parsedRange,
    note,
    referenceType: 'derived_from_grinder_band',
    calibrationRequired: true,
    source: hasCatalogBandProvenance ? `catalog_${fallbackBand.band}_band` : 'derived_from_grinder_band',
    sourceUrls: grinder.sourceUrls,
    verificationLevel: hasCatalogBandProvenance && !espressoNotRecommended ? grinder.verificationLevel : 'fallback',
    verifiedAt: hasCatalogBandProvenance ? grinder.verifiedAt : catalog.catalogVersion,
    popularityTier: grinder.popularityTier,
    marketSegment: grinder.marketSegment,
    releaseStatus: grinder.releaseStatus,
    confidence: hasCatalogBandProvenance && !espressoNotRecommended ? grinder.confidence : 'low',
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
      const primary = formatFeimaSetting(adjusted.center);
      const lower = formatFeimaSetting(adjusted.min);
      const upper = formatFeimaSetting(adjusted.max);
      const recommendation = formatGrindRecommendation({
        primary,
        lowerCorrection: lower,
        upperCorrection: upper,
      });
      return {
        grindBandLabel: setting.rangeLabel,
        grindRecommendation: `${recommendation.headline}. Correction range: ${lower} to ${upper}. ${recommendation.correction}`,
        confidenceNotes: [
          isFeimaCuratedConeSetting(setting)
            ? `${setting.note} Roast and target profile shift the starting point inside the curated 600N platform window.`
            : setting.note,
        ],
        verificationLevel: setting.verificationLevel,
      };
    }
    const primary = formatParsedSetting(adjusted.center, setting.parsedRange);
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
