import type { AiBrewMethodFamily } from './types.ts';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function roundToIncrement(value: number, increment: number) {
  if (increment <= 0) return Math.round(value);
  return Math.round(value / increment) * increment;
}

export function resolveBaristaVolumeIncrementMl(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'espresso') return 1;
  if (methodFamily === 'cold_brew' || methodFamily === 'batch_brew') return 25;
  return 5;
}

export function resolveBaristaTimeIncrementSeconds(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'espresso') return 1;
  if (methodFamily === 'cold_brew') return 300;
  if (methodFamily === 'batch_brew') return 15;
  return 5;
}

export function roundBaristaVolumeMl(value: number, methodFamily: AiBrewMethodFamily) {
  return Math.max(0, roundToIncrement(value, resolveBaristaVolumeIncrementMl(methodFamily)));
}

export function roundBaristaTimeSeconds(value: number, methodFamily: AiBrewMethodFamily) {
  return Math.max(0, roundToIncrement(value, resolveBaristaTimeIncrementSeconds(methodFamily)));
}

export function roundEstimatedCupOutputMl(value: number, methodFamily: AiBrewMethodFamily) {
  const increment = resolveBaristaVolumeIncrementMl(methodFamily);
  return Math.max(0, Math.floor(Math.max(0, value) / increment) * increment);
}

export function estimateCoffeeRetentionMl(doseG: number, brewMode: 'hot' | 'iced') {
  const multiplier = brewMode === 'iced' ? 1.8 : 2.1;
  return Math.round(Math.max(0, doseG) * multiplier);
}

export function estimateCupOutputMl(totalInputMl: number, doseG: number, brewMode: 'hot' | 'iced') {
  const retention = estimateCoffeeRetentionMl(doseG, brewMode);
  return Math.max(0, Math.round(totalInputMl - retention));
}

export function clampRoundedToIncrement(value: number, min: number, max: number, increment: number) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const alignedLower = Math.ceil(lower / increment) * increment;
  const alignedUpper = Math.floor(upper / increment) * increment;
  if (alignedLower <= alignedUpper) {
    return clamp(roundToIncrement(value, increment), alignedLower, alignedUpper);
  }
  return roundTo(clamp(value, lower, upper), 0);
}
