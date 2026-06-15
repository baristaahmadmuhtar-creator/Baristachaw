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
import { isEspressoBlockedGrinder } from './grinderSafetyGuardrails.ts';

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
    const style = deviceProfile.recipeStyle || 'traditional';
    const isDoubleFilter = style === 'double_filter';
    const isHeavy = style === 'heavy_concentrate';
    let rangeLabel = '';
    let parsedRange: ParsedNumericRange | null = null;
    let note = '';

    if (grinder.id === 'comandante-c40-mk4') {
      if (isDoubleFilter) {
        rangeLabel = '22 - 27 clicks';
        parsedRange = { min: 22, max: 27, unitLabel: 'clicks', precision: 0 };
        note = 'French Press double filter starting point for Comandante C40: 22-27 clicks (medium to medium-coarse); calibrate from sediment and press resistance.';
      } else if (isHeavy) {
        rangeLabel = '24 - 31 clicks';
        parsedRange = { min: 24, max: 31, unitLabel: 'clicks', precision: 0 };
        note = 'French Press heavy concentrate starting point for Comandante C40: 24-31 clicks; tighten only if the cup tastes thin after decant.';
      } else {
        rangeLabel = '31 - 35 clicks';
        parsedRange = { min: 31, max: 35, unitLabel: 'clicks', precision: 0 };
        note = 'French Press coarse starting point for Comandante C40: 31-35 clicks; calibrate from true zero, roast density, and sediment.';
      }
    } else if (grinder.id === 'baratza-encore') {
      if (isDoubleFilter) {
        rangeLabel = '#16 - #22';
        parsedRange = { min: 16, max: 22, unitLabel: 'setting', precision: 0 };
        note = 'French Press double filter starting point for Baratza Encore: #16-#22 (medium to medium-coarse); calibrate from sediment and press resistance.';
      } else if (isHeavy) {
        rangeLabel = '#22 - #28';
        parsedRange = { min: 22, max: 28, unitLabel: 'setting', precision: 0 };
        note = 'French Press heavy concentrate starting point for Baratza Encore: #22-#28; tighten only after tasting and checking sludge.';
      } else {
        rangeLabel = '#26 - #32';
        parsedRange = { min: 26, max: 32, unitLabel: 'setting', precision: 0 };
        note = 'French Press coarse starting point for Baratza Encore: #26-#32; calibrate by taste, roast density, and sediment.';
      }
    } else if (grinder.id === 'fellow-ode-gen-2') {
      if (isDoubleFilter) {
        rangeLabel = '5.0 - 7.0';
        parsedRange = { min: 5.0, max: 7.0, unitLabel: 'setting', precision: 1 };
        note = 'French Press double filter starting point for Fellow Ode Gen 2: 5.0-7.0 (medium to medium-coarse); calibrate from press feel and clarity.';
      } else if (isHeavy) {
        rangeLabel = '6.5 - 8.5';
        parsedRange = { min: 6.5, max: 8.5, unitLabel: 'setting', precision: 1 };
        note = 'French Press heavy concentrate starting point for Fellow Ode Gen 2: 6.5-8.5; tighten only if strength is low after decant.';
      } else {
        rangeLabel = '8.0 - 11.0';
        parsedRange = { min: 8.0, max: 11.0, unitLabel: 'setting', precision: 1 };
        note = 'French Press coarse starting point for Fellow Ode Gen 2: 8.0-11.0; calibrate from roast density and sediment.';
      }
    } else if (grinder.id === 'timemore-c2') {
      if (isDoubleFilter) {
        rangeLabel = '20 - 24 clicks';
        parsedRange = { min: 20, max: 24, unitLabel: 'clicks', precision: 0 };
        note = 'French Press double filter starting point for Timemore C2: 20-24 clicks (medium to medium-coarse); calibrate from sediment and flow through the added paper.';
      } else if (isHeavy) {
        rangeLabel = '22 - 26 clicks';
        parsedRange = { min: 22, max: 26, unitLabel: 'clicks', precision: 0 };
        note = 'French Press heavy concentrate starting point for Timemore C2: 22-26 clicks; tighten only after checking strength and sediment.';
      } else {
        rangeLabel = '24 - 28 clicks';
        parsedRange = { min: 24, max: 28, unitLabel: 'clicks', precision: 0 };
        note = 'French Press coarse starting point for Timemore C2: 24-28 clicks; calibrate by taste and press resistance.';
      }
    } else if (grinder.id === 'timemore-s3') {
      if (isDoubleFilter) {
        rangeLabel = '7.0 - 8.5';
        parsedRange = { min: 7.0, max: 8.5, unitLabel: 'dial', precision: 1 };
        note = 'French Press double filter starting point for Timemore S3: 7.0-8.5 on the top dial; calibrate from zero point and sediment.';
      } else if (isHeavy) {
        rangeLabel = '8.0 - 10.0';
        parsedRange = { min: 8.0, max: 10.0, unitLabel: 'dial', precision: 1 };
        note = 'French Press heavy concentrate starting point for Timemore S3: 8.0-10.0 on the top dial; tighten only if the concentrate is weak.';
      } else {
        rangeLabel = '9.0 - 11.0';
        parsedRange = { min: 9.0, max: 11.0, unitLabel: 'dial', precision: 1 };
        note = 'French Press coarse starting point for Timemore S3: 9.0-11.0 on the top dial; calibrate from zero point, seasoning, and roast density.';
      }
    } else if (grinder.id === 'kingrinder-k6') {
      if (isDoubleFilter) {
        rangeLabel = '75 - 90 clicks';
        parsedRange = { min: 75, max: 90, unitLabel: 'clicks', precision: 0 };
        note = 'French Press double filter starting point for KINGrinder K6: 75-90 clicks from true zero; calibrate from sediment and paper resistance.';
      } else if (isHeavy) {
        rangeLabel = '85 - 105 clicks';
        parsedRange = { min: 85, max: 105, unitLabel: 'clicks', precision: 0 };
        note = 'French Press heavy concentrate starting point for KINGrinder K6: 85-105 clicks from true zero; tighten only after tasting strength.';
      } else {
        rangeLabel = '90 - 120 clicks';
        parsedRange = { min: 90, max: 120, unitLabel: 'clicks', precision: 0 };
        note = 'French Press coarse starting point for KINGrinder K6: 90-120 clicks from true zero; calibrate from burr seasoning, roast density, and sediment.';
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
  const methodBlocked = grinder.avoidMethodFamilies?.includes(deviceProfile.methodFamily)
    || (deviceProfile.methodFamily === 'espresso' && isEspressoBlockedGrinder(grinder));
  const exact = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.includes(deviceProfile.id),
  );
  if (exact && !methodBlocked) return exact;

  const familyIds = catalog.deviceProfiles
    .filter((entry) => !entry.exactMatch && entry.methodFamily === deviceProfile.methodFamily && entry.brewMode === brewMode)
    .map((entry) => entry.id);

  const familySetting = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.some((profileId) => familyIds.includes(profileId)),
  );
  if (familySetting && !methodBlocked) return familySetting;

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
  }) + (methodBlocked
    ? ` Hard warning: this grinder is not recommended for ${deviceProfile.methodFamily}; a safe range is not verified.`
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
    verificationLevel: hasCatalogBandProvenance && !methodBlocked ? grinder.verificationLevel : 'fallback',
    verifiedAt: hasCatalogBandProvenance ? grinder.verifiedAt : catalog.catalogVersion,
    popularityTier: grinder.popularityTier,
    marketSegment: grinder.marketSegment,
    releaseStatus: grinder.releaseStatus,
    confidence: hasCatalogBandProvenance && !methodBlocked ? grinder.confidence : 'low',
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
