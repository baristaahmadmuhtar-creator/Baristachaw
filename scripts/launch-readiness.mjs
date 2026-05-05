import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

const checks = [
  {
    name: 'Production env',
    command: 'npm',
    args: ['run', 'prod:env:check'],
    blocker: true,
  },
  {
    name: 'Mobile auth env',
    command: 'npm',
    args: ['run', 'mobile:auth:check'],
    blocker: true,
  },
  {
    name: 'Type-check and web build',
    command: 'npm',
    args: ['run', 'check'],
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
    args: ['run', 'catalog:audit'],
    blocker: true,
  },
];

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
  results.push(await runCheck(check));
}

console.log('\nLaunch readiness summary');
for (const result of results) {
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`- ${status}: ${result.name}`);
}

const failedBlockers = results.filter((result) => result.blocker && result.code !== 0);
if (failedBlockers.length > 0) {
  console.log('\nStatus: belum siap launch. Tutup blocker di atas lalu jalankan lagi: npm run launch:doctor');
  process.exitCode = 1;
} else {
  console.log('\nStatus: code dan env utama siap untuk smoke test production.');
}
