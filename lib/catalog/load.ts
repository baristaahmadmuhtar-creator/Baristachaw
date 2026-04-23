import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CatalogState, DripperRecord, GrinderRecord, WaterRecord } from './types.js';

const CATALOG_ROOT = path.resolve(process.cwd(), 'data/catalog/normalized/phase1');

let catalogPromise: Promise<CatalogState> | null = null;

async function readJsonFile<T>(filename: string): Promise<T> {
  const contents = await readFile(path.join(CATALOG_ROOT, filename), 'utf8');
  return JSON.parse(contents) as T;
}

export async function loadCatalogState(): Promise<CatalogState> {
  if (catalogPromise) return catalogPromise;

  catalogPromise = Promise.all([
    readJsonFile<{ version: string; items: WaterRecord[] }>('waters.json'),
    readJsonFile<{ version: string; items: DripperRecord[] }>('drippers.json'),
    readJsonFile<{ version: string; items: GrinderRecord[] }>('grinders.json'),
  ]).then(([waters, drippers, grinders]) => ({
    version: waters.version || drippers.version || grinders.version || 'phase1',
    waters: waters.items,
    drippers: drippers.items,
    grinders: grinders.items,
  })).catch((error) => {
    catalogPromise = null;
    throw error;
  });

  return catalogPromise;
}
