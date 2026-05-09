import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.slice('--mode='.length) || 'local';

function npmArgs(script, extraArgs = []) {
  return ['run', script, ...extraArgs];
}

const baseChecks = [
  {
    name: 'Production env',
    command: 'npm',
    args: npmArgs('prod:env:check', ['--', '--mode=local']),
    blocker: true,
  },
  {
    name: 'Mobile auth env',
    command: 'npm',
    args: npmArgs('mobile:auth:check'),
    blocker: true,
  },
  {
    name: 'Type-check and web build',
    command: 'npm',
    args: npmArgs('check'),
    blocker: true,
  },
  {
    name: 'Launch unit contracts',
    command: 'node',
    args: [
      '--experimental-strip-types',
      '--import',
      './tests/unit/register-sandbox-loader.mjs',
      '--test',
      '--test-isolation=none',
      'tests/unit/aiAccessGate.test.ts',
      'tests/unit/adminManagementSchema.test.ts',
      'tests/unit/accountStatusHandler.test.ts',
      'tests/unit/billingSyncHandler.test.ts',
    ],
    blocker: true,
  },
  {
    name: 'Catalog data audit',
    command: 'npm',
    args: npmArgs('catalog:audit'),
    blocker: true,
  },
];

const finalChecks = [
  {
    name: 'Vercel production env-name presence',
    command: 'npm',
    args: npmArgs('prod:env:check', ['--', '--mode=vercel']),
    blocker: true,
  },
  {
    name: 'Secure runtime env injection',
    command: 'npm',
    args: npmArgs('prod:env:check', ['--', '--mode=runtime']),
    blocker: true,
  },
  {
    name: 'Mobile auth env',
    command: 'npm',
    args: npmArgs('mobile:auth:check'),
    blocker: true,
  },
  {
    name: 'Release verification',
    command: 'npm',
    args: npmArgs('release:verify'),
    blocker: true,
  },
  {
    name: 'Catalog data audit',
    command: 'npm',
    args: npmArgs('catalog:audit'),
    blocker: true,
  },
  {
    name: 'Production public smoke',
    command: 'npm',
    args: npmArgs('smoke:prod'),
    blocker: true,
  },
  {
    name: 'Production authenticated smoke',
    command: 'npm',
    args: npmArgs('smoke:prod:auth'),
    blocker: true,
  },
  {
    name: 'Production gate',
    command: 'npm',
    args: npmArgs('test:prod:gate'),
    blocker: true,
  },
];

const checks = mode === 'final' ? finalChecks : baseChecks;

function runCheck(check) {
  return new Promise((resolve) => {
    console.log(`\n=== ${check.name} ===`);
    const child = spawn(
      isWindows ? 'cmd.exe' : check.command,
      isWindows ? ['/d', '/s', '/c', [check.command, ...check.args].join(' ')] : check.args,
      {
        stdio: 'inherit',
        env: process.env,
      },
    );

    child.on('close', (code) => {
      resolve({
        ...check,
        code: typeof code === 'number' ? code : 1,
      });
    });
    child.on('error', (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      resolve({
        ...check,
        code: 1,
      });
    });
  });
}

const results = [];
for (const check of checks) {
  const result = await runCheck(check);
  results.push(result);
  if (mode === 'final' && check.blocker && result.code !== 0) {
    console.log(`\nStopping final gate after blocker failure: ${check.name}`);
    break;
  }
}

console.log(`\nLaunch readiness summary (${mode})`);
for (const result of results) {
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`- ${status}: ${result.name}`);
}

const failedBlockers = results.filter((result) => result.blocker && result.code !== 0);
if (failedBlockers.length > 0) {
  console.log('\nStatus: belum siap launch. Tutup blocker di atas lalu jalankan lagi: npm run launch:doctor');
  process.exitCode = 1;
} else if (mode === 'final') {
  console.log('\nStatus: final production gate passed. Public launch may proceed after merge/deploy policy is satisfied.');
} else {
  console.log('\nStatus: code dan env utama siap untuk smoke test production.');
}
