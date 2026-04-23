import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCatalogArtifacts } from '../../lib/catalog/build.js';
import type { CatalogState, DripperRecord, GrinderRecord, WaterRecord } from '../../lib/catalog/types.js';

const ROOT = path.resolve(process.cwd());
const NORMALIZED_ROOT = path.join(ROOT, 'data/catalog/normalized/phase1');
const EXPORT_ROOT = path.join(ROOT, 'data/catalog/exports/phase1');
const REPORT_ROOT = path.join(ROOT, 'data/catalog/reports');
const PUBLIC_ROOT = path.join(ROOT, 'apps/web/public/data/catalog/phase1');

async function readJson<T>(filename: string): Promise<T> {
  const contents = await readFile(path.join(NORMALIZED_ROOT, filename), 'utf8');
  return JSON.parse(contents) as T;
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const waters = await readJson<{ version: string; items: WaterRecord[] }>('waters.json');
  const drippers = await readJson<{ version: string; items: DripperRecord[] }>('drippers.json');
  const grinders = await readJson<{ version: string; items: GrinderRecord[] }>('grinders.json');

  const catalog: CatalogState = {
    version: waters.version || drippers.version || grinders.version || 'phase1',
    waters: waters.items,
    drippers: drippers.items,
    grinders: grinders.items,
  };

  const artifacts = buildCatalogArtifacts(catalog);

  const meta = {
    version: catalog.version,
    generated_at: new Date().toISOString(),
    counts: {
      waters_total: catalog.waters.length,
      waters_published: catalog.waters.filter(item => item.published).length,
      waters_brew_ready: catalog.waters.filter(item => item.is_brew_ready).length,
      drippers_total: catalog.drippers.length,
      drippers_published: catalog.drippers.filter(item => item.published).length,
      grinders_total: catalog.grinders.length,
      grinders_published: catalog.grinders.filter(item => item.published).length,
    },
  };

  await Promise.all([
    writeJson(path.join(EXPORT_ROOT, 'waters.catalog.json'), { version: catalog.version, items: artifacts.watersCatalog }),
    writeJson(path.join(EXPORT_ROOT, 'waters.search.json'), { version: catalog.version, items: artifacts.waterSearch }),
    writeJson(path.join(EXPORT_ROOT, 'drippers.search.json'), { version: catalog.version, items: artifacts.dripperSearch }),
    writeJson(path.join(EXPORT_ROOT, 'grinders.search.json'), { version: catalog.version, items: artifacts.grinderSearch }),
    writeJson(path.join(EXPORT_ROOT, 'meta.json'), meta),
    writeJson(path.join(REPORT_ROOT, 'phase1-quality-report.json'), artifacts.report),
    writeJson(path.join(PUBLIC_ROOT, 'waters.catalog.json'), { version: catalog.version, items: artifacts.watersCatalog }),
    writeJson(path.join(PUBLIC_ROOT, 'waters.search.json'), { version: catalog.version, items: artifacts.waterSearch }),
    writeJson(path.join(PUBLIC_ROOT, 'drippers.search.json'), { version: catalog.version, items: artifacts.dripperSearch }),
    writeJson(path.join(PUBLIC_ROOT, 'grinders.search.json'), { version: catalog.version, items: artifacts.grinderSearch }),
    writeJson(path.join(PUBLIC_ROOT, 'meta.json'), meta),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
