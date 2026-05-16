import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const modeArg = process.argv.slice(2).find((arg) => arg.startsWith('--mode='));
const mode = (modeArg?.split('=')[1] || (args.has('--deep') ? 'deep' : args.has('--report') ? 'report' : 'standard')).toLowerCase();

const nodeArgsBase = [
  '--experimental-strip-types',
  '--import',
  './tests/unit/register-sandbox-loader.mjs',
  '--test',
  '--test-isolation=none',
];

const patterns = {
  quick: 'real-world bean stress matrix|AI Brew release snapshot matrix|all-method public snapshot matrix',
  standard: 'AI Brew 10000-combination global stress matrix|AI Brew grinder size matrix',
  deep: 'AI Brew 10000-combination global stress matrix|AI Brew 100000-combination iced guide stress matrix|AI Brew grinder size matrix',
};

function runNodeTest(pattern) {
  const result = spawnSync(process.execPath, [
    ...nodeArgsBase,
    '--test-name-pattern',
    pattern,
    'tests/unit/aiBrewPlanner.test.ts',
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  process.exitCode = result.status ?? 1;
}

function latestMarkdown(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const full = path.join(dir, entry.name);
      return { name: entry.name, full, mtimeMs: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!entries[0]) return null;
  return fs.readdirSync(entries[0].full)
    .filter((file) => file.endsWith('.md') || file.endsWith('.json'))
    .map((file) => path.join(entries[0].full, file));
}

function reportArtifacts() {
  const roots = [
    'artifacts/ai-brew-audit/full-method-audit',
    'artifacts/ai-brew-audit/global-10k-stress',
    'artifacts/ai-brew-audit/iced-100k-guide-stress',
    'artifacts/ai-brew-audit/grind-size-matrix',
  ];
  const found = roots.flatMap((root) => latestMarkdown(root) || []);
  if (found.length === 0) {
    console.error('No AI Brew audit artifacts found. Run npm run test:ai-brew:deep first.');
    process.exitCode = 1;
    return;
  }
  console.log('Latest AI Brew audit artifacts:');
  for (const file of found) console.log(`- ${file}`);
}

if (mode === 'report') {
  reportArtifacts();
} else if (patterns[mode]) {
  runNodeTest(patterns[mode]);
} else {
  console.error(`Unknown AI Brew stress mode "${mode}". Use quick, standard, deep, or report.`);
  process.exitCode = 1;
}
