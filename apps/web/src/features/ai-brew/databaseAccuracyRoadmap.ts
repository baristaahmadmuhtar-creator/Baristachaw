export type AiBrewEvidenceLevel =
  | 'official_public'
  | 'official_label_or_report'
  | 'internal_measured'
  | 'community_verified'
  | 'curated_baseline'
  | 'fallback_estimate';

export type AiBrewDataPromotionState =
  | 'blocked'
  | 'manual_only'
  | 'curated'
  | 'verified'
  | 'official';

export interface AiBrewSourceEvidenceRequirement {
  evidenceLevel: AiBrewEvidenceLevel;
  acceptedForProduction: boolean;
  requiredFields: string[];
  notes: string;
}

export interface AiBrewMeasurementProtocol {
  name: string;
  equipment: string[];
  steps: string[];
  promotionGate: string;
}

export interface AiBrewAccuracyRoadmap {
  priorityMarkets: string[];
  priorityWaters: string[];
  priorityGrinders: string[];
  waterEvidenceRequirements: AiBrewSourceEvidenceRequirement[];
  grinderEvidenceRequirements: AiBrewSourceEvidenceRequirement[];
  waterMeasurementProtocol: AiBrewMeasurementProtocol;
  grinderCalibrationProtocol: AiBrewMeasurementProtocol;
  promotionRules: Record<AiBrewDataPromotionState, string>;
}

export const AI_BREW_DATABASE_ACCURACY_ROADMAP: AiBrewAccuracyRoadmap = {
  priorityMarkets: ['Indonesia', 'Brunei', 'Singapore', 'Malaysia', 'Global reference'],
  priorityWaters: [
    'Aqua',
    'Le Minerale',
    'Cleo',
    'Amidis',
    'Vit',
    'Ades',
    'Club',
    'Pristine',
    'Nestle Pure Life',
    'Crystalline',
    'evian',
    'Volvic',
    'Acqua Panna',
  ],
  priorityGrinders: [
    '1Zpresso K-Ultra',
    '1Zpresso ZP6',
    '1Zpresso Q2/Q Air',
    'Comandante C40',
    'Timemore C2/C3/S3',
    'Kingrinder K6',
    'Hario Mini Slim',
    'Feima 600N',
    'Baratza Encore/ESP',
    'Fellow Ode',
  ],
  waterEvidenceRequirements: [
    {
      evidenceLevel: 'official_public',
      acceptedForProduction: true,
      requiredFields: ['source_url', 'market_or_sku_scope', 'tds', 'hardness_or_ca_mg', 'alkalinity_or_bicarbonate', 'checked_at'],
      notes: 'Best evidence is official brand analysis, water quality report, lab report, or official label.',
    },
    {
      evidenceLevel: 'internal_measured',
      acceptedForProduction: true,
      requiredFields: ['tds_triplicate', 'gh_triplicate', 'kh_triplicate', 'measurement_date', 'equipment', 'operator'],
      notes: 'Internal measurements can promote entries when method and equipment calibration are recorded.',
    },
    {
      evidenceLevel: 'community_verified',
      acceptedForProduction: false,
      requiredFields: ['source_url', 'notes', 'review_due_at'],
      notes: 'Community references can seed curated data but must not be presented as official.',
    },
    {
      evidenceLevel: 'fallback_estimate',
      acceptedForProduction: false,
      requiredFields: ['classification_reason', 'blocked_reason'],
      notes: 'Fallback estimates must remain manual-only or needs-review.',
    },
  ],
  grinderEvidenceRequirements: [
    {
      evidenceLevel: 'official_public',
      acceptedForProduction: true,
      requiredFields: ['manufacturer_url', 'model_scope', 'unit_style', 'zero_point_method_or_caveat', 'checked_at'],
      notes: 'Official manuals or manufacturer grind charts can drive official labels.',
    },
    {
      evidenceLevel: 'internal_measured',
      acceptedForProduction: true,
      requiredFields: ['zero_point', 'coffee', 'roast', 'method', 'setting_sweep', 'drawdown', 'taste_notes'],
      notes: 'Internal calibration can improve ranges but remains model/unit-scoped.',
    },
    {
      evidenceLevel: 'curated_baseline',
      acceptedForProduction: true,
      requiredFields: ['source_url', 'confidence', 'dial_in_caveat'],
      notes: 'Curated grinder settings are starting points and must keep drawdown/taste validation copy.',
    },
    {
      evidenceLevel: 'fallback_estimate',
      acceptedForProduction: false,
      requiredFields: ['fallback_reason', 'user_validation_copy'],
      notes: 'Fallback grinders must not claim official or exact status.',
    },
  ],
  waterMeasurementProtocol: {
    name: 'Water mineral verification',
    equipment: [
      'calibrated TDS/EC meter with calibration solution',
      'GH titration kit',
      'KH titration kit',
      'pH meter',
      'chlorine/chloramine strips',
      'optional lab measurement',
    ],
    steps: [
      'Record brand, SKU, market, package size, lot/date when available, and bottle state.',
      'Calibrate meters before measurement and record calibration solution.',
      'Measure TDS, GH, and KH in triplicate; use median value.',
      'Record temperature and any visible label/lab evidence.',
      'Classify as ready, high buffer, base water, manual-only, or needs review.',
    ],
    promotionGate: 'Promote to verified only when source evidence or internal measurement protocol is complete.',
  },
  grinderCalibrationProtocol: {
    name: 'Grinder setting verification',
    equipment: [
      'scale',
      'timer',
      'consistent water',
      'fixed brew protocol',
      'optional refractometer',
      'optional sieve or particle analyser',
    ],
    steps: [
      'Record grinder model, burr type, zero point, click direction, and user offset.',
      'Use a fixed coffee, roast age, dose, method, filter, water, and temperature.',
      'Run a three-setting sweep around the catalog baseline.',
      'Record drawdown, beverage TDS when available, and sensory notes.',
      'Publish only as a starting range with calibration caveat.',
    ],
    promotionGate: 'Promote to verified/internal-measured only when repeatable method-specific ranges are documented.',
  },
  promotionRules: {
    blocked: 'Do not show as brew-ready or official; require evidence or manual input.',
    manual_only: 'Allow manual user entry and deterministic planning, but do not present as a catalog-ready preset.',
    curated: 'Show curated/fallback copy and require taste/drawdown validation.',
    verified: 'Show high confidence when evidence or internal measurement is complete.',
    official: 'Show official only for manufacturer/brand/lab/regulator evidence with model/SKU scope.',
  },
};
