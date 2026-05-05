import type { ProcessCatalogEntry, VarietyCatalogEntry } from './types.ts';
import calibrationData from './data/planner-calibration.v2026-05.json' with { type: 'json' };

export const PLANNER_CALIBRATION_VERSION_V2026_05 = calibrationData.version;

export const PROCESS_CURATED_MODIFIERS_V2026_05 =
  calibrationData.processModifiers as Record<string, NonNullable<ProcessCatalogEntry['numericModifiers']>>;

export const VARIETY_CURATED_MODIFIERS_V2026_05 =
  calibrationData.varietyModifiers as Record<string, NonNullable<VarietyCatalogEntry['numericModifiers']>>;

export const ORIGIN_PROFILE_RULES_V2026_05 =
  calibrationData.originProfiles as Array<{
    profileId: string;
    label: string;
    keywords: string[];
  }>;
