import { spawn } from 'node:child_process';
import {
  SMOKE_AUTH_ENV_GROUPS,
  checkRuntimeEnv,
  printSafeEnvReport,
} from './lib/env-check.mjs';

const NPM_BIN = 'npm';
const BASE_URL = process.env.BASE_URL || 'https://baristaclaw.vercel.app';

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const child = spawn(
      isWindows ? 'cmd.exe' : command,
      isWindows ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args,
      { stdio: 'inherit', env }
    );
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  const authReport = checkRuntimeEnv(SMOKE_AUTH_ENV_GROUPS, {
    env: process.env,
    mode: 'runtime',
    target: 'process.env',
    allowLocalUnavailable: false,
  });
  printSafeEnvReport(authReport, { title: 'Production smoke auth env gate' });
  if (!authReport.ok) {
    throw new Error('Missing production smoke auth runtime env: set PROD_SMOKE_BEARER_TOKEN or PROD_SMOKE_EMAIL + PROD_SMOKE_PASSWORD in secure runtime.');
  }

  const env = {
    ...process.env,
    BASE_URL,
  };

  await run(NPM_BIN, ['run', 'smoke:prod:auth'], env);
}

main().catch((error) => {
  console.error('[prod-gate] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
