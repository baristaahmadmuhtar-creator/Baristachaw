import type { AiBrewFormState } from '../features/ai-brew/types.ts';

export const EQUIPMENT_PREFERENCES_KEY = 'BARISTACHAW_EQUIPMENT_PREFERENCES_V1';

export interface EquipmentPreferences {
  completedAt: number;
  preferredDripperId?: string;
  preferredGrinderId?: string;
  customDripperName?: string;
  customGrinderName?: string;
  skippedEquipmentAt?: number;
}

function cleanText(value: unknown, maxLength = 100): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  return normalized || undefined;
}

function cleanTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : Date.now();
}

export function normalizeEquipmentPreferences(value: unknown): EquipmentPreferences {
  const candidate = value && typeof value === 'object'
    ? value as Partial<EquipmentPreferences>
    : {};
  return {
    completedAt: cleanTimestamp(candidate.completedAt),
    preferredDripperId: cleanText(candidate.preferredDripperId),
    preferredGrinderId: cleanText(candidate.preferredGrinderId),
    customDripperName: cleanText(candidate.customDripperName),
    customGrinderName: cleanText(candidate.customGrinderName),
    skippedEquipmentAt: candidate.skippedEquipmentAt
      ? cleanTimestamp(candidate.skippedEquipmentAt)
      : undefined,
  };
}

export function loadEquipmentPreferences(): EquipmentPreferences | null {
  try {
    const raw = window.localStorage.getItem(EQUIPMENT_PREFERENCES_KEY);
    return raw ? normalizeEquipmentPreferences(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveEquipmentPreferences(value: EquipmentPreferences): EquipmentPreferences {
  const normalized = normalizeEquipmentPreferences(value);
  try {
    window.localStorage.setItem(EQUIPMENT_PREFERENCES_KEY, JSON.stringify(normalized));
  } catch {
    // Storage may be unavailable in private or embedded runtimes.
  }
  return normalized;
}

export function sortEquipmentByPreference<T extends { id: string }>(
  items: readonly T[],
  preferredId?: string,
): T[] {
  if (!preferredId) return [...items];
  return [...items].sort((left, right) => {
    if (left.id === preferredId) return -1;
    if (right.id === preferredId) return 1;
    return 0;
  });
}

export function applyEquipmentPreferencesToForm<T extends Pick<AiBrewFormState, 'dripperId' | 'grinderId'>>(
  form: T,
  preferences: EquipmentPreferences | null,
  catalog: {
    dripperIds: ReadonlySet<string>;
    grinderIds: ReadonlySet<string>;
  },
): T {
  if (!preferences) return form;
  return {
    ...form,
    dripperId: preferences.preferredDripperId
      && catalog.dripperIds.has(preferences.preferredDripperId)
      ? preferences.preferredDripperId
      : form.dripperId,
    grinderId: preferences.preferredGrinderId
      && catalog.grinderIds.has(preferences.preferredGrinderId)
      ? preferences.preferredGrinderId
      : form.grinderId,
  };
}

export async function submitCatalogSuggestion(input: {
  kind: 'dripper' | 'grinder';
  brand?: string;
  model: string;
  region?: string;
  notes?: string;
}): Promise<void> {
  const model = cleanText(input.model);
  if (!model) return;
  const response = await fetch('/api/suggestions/brand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: input.kind,
      brand: cleanText(input.brand),
      model,
      region: cleanText(input.region),
      notes: cleanText(input.notes, 300),
    }),
  });
  if (!response.ok) {
    throw new Error(`Suggestion request failed with status ${response.status}.`);
  }
}
