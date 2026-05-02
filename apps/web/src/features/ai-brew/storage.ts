import { DB_STORES, idbDelete, idbGet, idbGetAll, idbPut } from '../../services/db.ts';
import type {
  AiBrewCatalog,
  BrewJournalEntry,
  BrewPlan,
  BrewPlanAiNotes,
  BrewPreset,
  BrewTasteFeedback,
} from './types';

const AI_BREW_FORM_STORAGE_KEY = 'BARISTACHAW_AI_BREW_FORM_V5';
const AI_BREW_CATALOG_SNAPSHOT_STORAGE_KEY = 'BARISTACHAW_AI_BREW_CATALOG_SNAPSHOT_V5';
const AI_BREW_LAST_PLAN_STORAGE_KEY = 'BARISTACHAW_AI_BREW_LAST_PLAN_V5';
const AI_BREW_STORAGE_SCHEMA_VERSION = 5;

interface VersionedAiBrewPayload<T> {
  schemaVersion: number;
  savedAt: number;
  payload: T;
}

function byUpdatedDesc<T extends { updatedAt: number }>(a: T, b: T) {
  return b.updatedAt - a.updatedAt;
}

function readVersionedStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VersionedAiBrewPayload<T>;
    if (parsed?.schemaVersion !== AI_BREW_STORAGE_SCHEMA_VERSION) return null;
    if (!parsed?.payload) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeVersionedStorage<T>(key: string, payload: T) {
  try {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: AI_BREW_STORAGE_SCHEMA_VERSION,
      savedAt: Date.now(),
      payload,
    } satisfies VersionedAiBrewPayload<T>));
  } catch {
    // Ignore storage write failures (private mode / quota / security policy).
  }
}

export function loadAiBrewFormDraft<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(AI_BREW_FORM_STORAGE_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

export function saveAiBrewFormDraft<T>(value: T) {
  try {
    localStorage.setItem(AI_BREW_FORM_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write failures (private mode / quota / security policy).
  }
}

export function loadCachedAiBrewCatalogSnapshot(): AiBrewCatalog | null {
  const snapshot = readVersionedStorage<AiBrewCatalog>(AI_BREW_CATALOG_SNAPSHOT_STORAGE_KEY);
  if (!snapshot?.catalogVersion) return null;
  if (
    !Array.isArray(snapshot.drippers)
    || !Array.isArray(snapshot.grinders)
    || !Array.isArray(snapshot.processes)
    || !Array.isArray(snapshot.varieties)
    || !Array.isArray(snapshot.waterBrands)
    || !Array.isArray(snapshot.targetProfiles)
    || !Array.isArray(snapshot.deviceProfiles)
    || !Array.isArray(snapshot.grinderSettings)
    || !snapshot.waterGuidance
  ) {
    return null;
  }
  return snapshot;
}

export function saveCachedAiBrewCatalogSnapshot(catalog: AiBrewCatalog) {
  writeVersionedStorage(AI_BREW_CATALOG_SNAPSHOT_STORAGE_KEY, catalog);
}

export function loadLastGeneratedBrewPlan(expectedCatalogVersion?: string): BrewPlan | null {
  const plan = readVersionedStorage<BrewPlan>(AI_BREW_LAST_PLAN_STORAGE_KEY);
  if (!plan?.id || !plan?.catalogVersion) return null;
  if (expectedCatalogVersion && plan.catalogVersion !== expectedCatalogVersion) return null;
  return plan;
}

export function saveLastGeneratedBrewPlan(plan: BrewPlan) {
  writeVersionedStorage(AI_BREW_LAST_PLAN_STORAGE_KEY, plan);
}

export async function saveBrewJournalEntry(entry: BrewJournalEntry): Promise<void> {
  await idbPut(DB_STORES.AI_BREW_JOURNAL, entry);
}

export async function updateBrewJournalAiNotes(id: string, patch: BrewPlanAiNotes): Promise<void> {
  const entry = await idbGet<BrewJournalEntry>(DB_STORES.AI_BREW_JOURNAL, id);
  if (!entry) return;
  const next = {
    ...entry,
    updatedAt: Date.now(),
    aiNotes: {
      ...(entry.aiNotes || {}),
      ...patch,
    },
    plan: {
      ...entry.plan,
      aiNotes: {
        ...(entry.plan.aiNotes || {}),
        ...patch,
      },
    },
  } satisfies BrewJournalEntry;
  await idbPut(DB_STORES.AI_BREW_JOURNAL, next);
}

export async function updateBrewJournalFeedback(
  id: string,
  feedback: BrewTasteFeedback,
): Promise<BrewJournalEntry | null> {
  const entry = await idbGet<BrewJournalEntry>(DB_STORES.AI_BREW_JOURNAL, id);
  if (!entry) return null;
  const now = Date.now();
  const next = {
    ...entry,
    updatedAt: now,
    feedback: {
      ...feedback,
      updatedAt: now,
    },
  } satisfies BrewJournalEntry;
  await idbPut(DB_STORES.AI_BREW_JOURNAL, next);
  return next;
}

export async function listRecentBrewJournalEntries(limit = 6): Promise<BrewJournalEntry[]> {
  const all = await idbGetAll<BrewJournalEntry>(DB_STORES.AI_BREW_JOURNAL);
  return all.sort(byUpdatedDesc).slice(0, limit);
}

export async function saveBrewPreset(preset: BrewPreset): Promise<void> {
  await idbPut(DB_STORES.AI_BREW_PRESETS, preset);
}

export async function deleteBrewPreset(id: string): Promise<void> {
  await idbDelete(DB_STORES.AI_BREW_PRESETS, id);
}

export async function listBrewPresets(): Promise<BrewPreset[]> {
  const all = await idbGetAll<BrewPreset>(DB_STORES.AI_BREW_PRESETS);
  return all.sort(byUpdatedDesc);
}

export async function findBrewPresetByFingerprint(fingerprint: string): Promise<BrewPreset | undefined> {
  const all = await listBrewPresets();
  return all.find((preset) => preset.fingerprint === fingerprint);
}
