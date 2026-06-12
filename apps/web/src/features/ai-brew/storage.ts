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
const AI_BREW_CATALOG_SNAPSHOT_DB_KEY = 'ai_brew_catalog_snapshot_v5';
const AI_BREW_LAST_PLAN_STORAGE_KEY = 'BARISTACHAW_AI_BREW_LAST_PLAN_V5';
const AI_BREW_SEQUENCE_CACHE_STORAGE_KEY = 'BARISTACHAW_AI_BREW_SEQUENCE_CACHE_V1';
const AI_BREW_STORAGE_SCHEMA_VERSION = 5;
const AI_BREW_SEQUENCE_CACHE_LIMIT = 30;
const AI_BREW_SEQUENCE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface VersionedAiBrewPayload<T> {
  schemaVersion: number;
  savedAt: number;
  payload: T;
}

interface AiBrewCatalogSnapshotRecord extends VersionedAiBrewPayload<AiBrewCatalog> {
  key: string;
}

export interface CachedAiBrewSequenceOverlay {
  fingerprint: string;
  catalogVersion: string;
  language: string;
  markdown: string;
  canonicalMarkdown: string;
  servicePattern: string[];
  watch: string[];
  stepInstructions: string[];
  fallbackDiagnostics: string[];
  provider?: string;
  createdAt: number;
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

function hasRequiredProductionDrippers(snapshot: AiBrewCatalog) {
  const dripperIds = new Set(snapshot.drippers.map((item) => item.id));
  const visibleLegacySwitch = snapshot.drippers.some((item) => (
    item.id === 'hario-switch' && (!item.hidden || !item.deprecated)
  ));
  return !visibleLegacySwitch
    && ['hario-switch-02', 'hario-switch-03', 'mugen-x-switch'].every((id) => dripperIds.has(id));
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

function validateCachedAiBrewCatalogSnapshot(snapshot: AiBrewCatalog | null | undefined): AiBrewCatalog | null {
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
  if (!hasRequiredProductionDrippers(snapshot)) return null;
  return snapshot;
}

export function hasAiBrewFormDraft(): boolean {
  try {
    return Boolean(localStorage.getItem(AI_BREW_FORM_STORAGE_KEY));
  } catch {
    return false;
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
  return validateCachedAiBrewCatalogSnapshot(
    readVersionedStorage<AiBrewCatalog>(AI_BREW_CATALOG_SNAPSHOT_STORAGE_KEY),
  );
}

export function saveCachedAiBrewCatalogSnapshot(catalog: AiBrewCatalog) {
  writeVersionedStorage(AI_BREW_CATALOG_SNAPSHOT_STORAGE_KEY, catalog);
}

export async function loadPersistentAiBrewCatalogSnapshot(): Promise<AiBrewCatalog | null> {
  const localSnapshot = loadCachedAiBrewCatalogSnapshot();
  if (localSnapshot) return localSnapshot;

  try {
    const record = await idbGet<AiBrewCatalogSnapshotRecord>(
      DB_STORES.META,
      AI_BREW_CATALOG_SNAPSHOT_DB_KEY,
    );
    if (record?.schemaVersion !== AI_BREW_STORAGE_SCHEMA_VERSION) return null;
    return validateCachedAiBrewCatalogSnapshot(record.payload);
  } catch {
    return null;
  }
}

export async function savePersistentAiBrewCatalogSnapshot(catalog: AiBrewCatalog): Promise<void> {
  saveCachedAiBrewCatalogSnapshot(catalog);
  try {
    await idbPut(DB_STORES.META, {
      key: AI_BREW_CATALOG_SNAPSHOT_DB_KEY,
      schemaVersion: AI_BREW_STORAGE_SCHEMA_VERSION,
      savedAt: Date.now(),
      payload: catalog,
    } satisfies AiBrewCatalogSnapshotRecord);
  } catch {
    // Keep the localStorage best-effort copy when IndexedDB is unavailable.
  }
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

function readAiBrewSequenceCache(): CachedAiBrewSequenceOverlay[] {
  const entries = readVersionedStorage<CachedAiBrewSequenceOverlay[]>(AI_BREW_SEQUENCE_CACHE_STORAGE_KEY);
  if (!Array.isArray(entries)) return [];
  const now = Date.now();
  return entries.filter((entry) => (
    typeof entry?.fingerprint === 'string'
    && typeof entry.catalogVersion === 'string'
    && typeof entry.language === 'string'
    && typeof entry.markdown === 'string'
    && typeof entry.canonicalMarkdown === 'string'
    && Array.isArray(entry.servicePattern)
    && Array.isArray(entry.watch)
    && Array.isArray(entry.stepInstructions)
    && Number.isFinite(entry.createdAt)
    && now - entry.createdAt <= AI_BREW_SEQUENCE_CACHE_TTL_MS
  ));
}

export function loadCachedAiBrewSequenceOverlay(
  fingerprint: string,
  language: string,
  catalogVersion: string,
): CachedAiBrewSequenceOverlay | null {
  const normalizedLanguage = String(language || 'en').trim().toLowerCase();
  return readAiBrewSequenceCache().find((entry) => (
    entry.fingerprint === fingerprint
    && entry.catalogVersion === catalogVersion
    && entry.language === normalizedLanguage
  )) || null;
}

export function saveCachedAiBrewSequenceOverlay(entry: Omit<CachedAiBrewSequenceOverlay, 'language' | 'createdAt'> & {
  language: string;
  createdAt?: number;
}) {
  const normalizedEntry: CachedAiBrewSequenceOverlay = {
    ...entry,
    language: String(entry.language || 'en').trim().toLowerCase(),
    createdAt: entry.createdAt || Date.now(),
  };
  const cache = readAiBrewSequenceCache()
    .filter((item) => !(
      item.fingerprint === normalizedEntry.fingerprint
      && item.catalogVersion === normalizedEntry.catalogVersion
      && item.language === normalizedEntry.language
    ));
  cache.unshift(normalizedEntry);
  writeVersionedStorage(
    AI_BREW_SEQUENCE_CACHE_STORAGE_KEY,
    cache
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, AI_BREW_SEQUENCE_CACHE_LIMIT),
  );
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
