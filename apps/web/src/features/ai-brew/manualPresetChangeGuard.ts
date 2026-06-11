import type { AiBrewFormState } from './types.ts';

const PRESET_CONTROLLED_FIELDS = new Set<keyof AiBrewFormState>([
  'brewMode',
  'dripperId',
  'targetProfileId',
  'pourStyle',
  'pourCount',
  'origamiFilterStyle',
  'aeropressStyle',
  'frenchPressStyle',
  'switchPresetId',
  'switchTeachingMode',
  'kalitaWaveStyle',
  'cleverDripperStyle',
  'chemexStyle',
  'mokaPotStyle',
  'coldBrewStyle',
  'batchBrewStyle',
  'siphonStyle',
  'origamiStyle',
  'aprilStyle',
  'melittaStyle',
  'konoStyle',
]);

type ManualPresetChangeInput<K extends keyof AiBrewFormState = keyof AiBrewFormState> = {
  activePresetId?: string;
  key: K;
  value: AiBrewFormState[K];
};

export type ManualPresetChangeResolution =
  | { kind: 'confirm_exit' }
  | { kind: 'apply'; clearPreset: boolean };

export function resolveManualPresetChange(
  input: ManualPresetChangeInput,
): ManualPresetChangeResolution {
  if (!input.activePresetId || input.key === 'manualPresetId') {
    return { kind: 'apply', clearPreset: false };
  }

  if (PRESET_CONTROLLED_FIELDS.has(input.key)) {
    return { kind: 'confirm_exit' };
  }

  return { kind: 'apply', clearPreset: false };
}
