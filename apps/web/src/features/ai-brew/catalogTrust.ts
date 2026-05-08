import type { AiBrewMethodFamily, CatalogConfidence, DeviceProfileMode, VerificationLevel } from './types.ts';

export type BrewerProfileTrustStatus = 'exact' | 'derived' | 'experimental' | 'calibration_required';

export interface BrewerFamilyOverride {
  family: AiBrewMethodFamily;
  trust: BrewerProfileTrustStatus;
  baseline: string;
}

export const BREWER_FAMILY_OVERRIDES: Record<string, BrewerFamilyOverride> = {
  'timemore-crystal-eye': {
    family: 'v60',
    trust: 'derived',
    baseline: 'Hario V60',
  },
  'suji-v60-dripper': {
    family: 'v60',
    trust: 'derived',
    baseline: 'Hario V60',
  },
  'cafec-flower-dripper': {
    family: 'v60',
    trust: 'derived',
    baseline: 'Cone dripper / V60',
  },
  'cafec-deep-27': {
    family: 'v60',
    trust: 'derived',
    baseline: 'Deep cone / V60',
  },
  'fellow-stagg-x': {
    family: 'april',
    trust: 'derived',
    baseline: 'Flat bottom',
  },
  'fellow-stagg-xf-dripper': {
    family: 'april',
    trust: 'derived',
    baseline: 'Flat bottom',
  },
  'timemore-b75': {
    family: 'april',
    trust: 'derived',
    baseline: 'Fast flat bottom',
  },
  'blue-bottle-dripper': {
    family: 'april',
    trust: 'derived',
    baseline: 'Flat bottom',
  },
  'hario-switch': {
    family: 'hario_switch',
    trust: 'calibration_required',
    baseline: 'Choose exact Switch 02, Switch 03, or MUGEN x SWITCH',
  },
  'nextlevel-pulsar': {
    family: 'april',
    trust: 'experimental',
    baseline: 'Low-bypass / no-bypass hybrid',
  },
  'tricolate-brewer': {
    family: 'april',
    trust: 'experimental',
    baseline: 'No-bypass flat bottom',
  },
  'vietnam-drip': {
    family: 'melitta',
    trust: 'calibration_required',
    baseline: 'Gravity insert dripper',
  },
};

const EXPERIMENTAL_MATCHERS = [
  'pulsar',
  'tricolate',
  'hero-variable',
  'variable',
  'gabi',
  'vietnam',
  'hybrid',
];

export function resolveBrewerProfileTrustStatus(params: {
  deviceProfileMode: DeviceProfileMode;
  verificationLevel?: VerificationLevel | string;
  confidence?: CatalogConfidence | string;
  exactMatch?: boolean;
  methodFamily?: AiBrewMethodFamily | string;
  dripperId?: string;
  dripperName?: string;
}): BrewerProfileTrustStatus {
  const name = `${params.dripperId || ''} ${params.dripperName || ''}`.toLowerCase();
  const override = params.dripperId ? BREWER_FAMILY_OVERRIDES[params.dripperId] : undefined;

  if (override) {
    return override.trust;
  }

  if (params.deviceProfileMode === 'exact' && params.exactMatch && params.confidence === 'high') {
    return 'exact';
  }

  if (EXPERIMENTAL_MATCHERS.some((keyword) => name.includes(keyword))) {
    return 'experimental';
  }

  if (params.deviceProfileMode === 'derived_template') {
    return 'derived';
  }

  if (params.deviceProfileMode === 'family_fallback') {
    return 'calibration_required';
  }

  if (params.verificationLevel === 'dataset_unverified' || params.confidence === 'low') {
    return 'calibration_required';
  }

  return 'derived';
}

export function formatBrewerProfileTrustLabel(status: BrewerProfileTrustStatus, language?: string) {
  const indonesian = String(language || '').toLowerCase().startsWith('id');
  if (!indonesian) {
    switch (status) {
      case 'exact':
        return 'Exact profile';
      case 'derived':
        return 'Derived profile';
      case 'experimental':
        return 'Experimental profile';
      case 'calibration_required':
        return 'Needs calibration';
    }
  }

  switch (status) {
    case 'exact':
      return 'Profil exact';
    case 'derived':
      return 'Profil turunan';
    case 'experimental':
      return 'Profil eksperimental';
    case 'calibration_required':
      return 'Butuh kalibrasi';
  }
}

export function formatBrewerProfileTrustDetail(params: {
  status: BrewerProfileTrustStatus;
  dripperId?: string;
  language?: string;
}) {
  const override = params.dripperId ? BREWER_FAMILY_OVERRIDES[params.dripperId] : undefined;
  if (!override) return '';

  const indonesian = String(params.language || '').toLowerCase().startsWith('id');
  if (params.status === 'derived') {
    return indonesian ? `Turunan dari ${override.baseline}` : `Derived from ${override.baseline}`;
  }
  if (params.status === 'experimental') {
    return indonesian ? `Eksperimental dari ${override.baseline}` : `Experimental from ${override.baseline}`;
  }
  if (params.status === 'calibration_required') {
    return indonesian ? `Kalibrasi dari ${override.baseline}` : `Calibrate from ${override.baseline}`;
  }
  return '';
}
