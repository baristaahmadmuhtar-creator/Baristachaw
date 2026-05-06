import { spawn } from 'node:child_process';

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
  const hasBearerToken = Boolean(String(process.env.PROD_SMOKE_BEARER_TOKEN || process.env.SMOKE_BEARER_TOKEN || '').trim());
  const hasEmailLogin = Boolean(
    String(process.env.PROD_SMOKE_EMAIL || process.env.SMOKE_EMAIL || '').trim()
    && String(process.env.PROD_SMOKE_PASSWORD || process.env.SMOKE_PASSWORD || '').trim(),
  );
  if (!hasBearerToken && !hasEmailLogin) {
    throw new Error('Missing production smoke auth: set PROD_SMOKE_BEARER_TOKEN or PROD_SMOKE_EMAIL + PROD_SMOKE_PASSWORD.');
  }

  const env = {
    ...process.env,
    BASE_URL,
  };

  await run(NPM_BIN, ['run', 'smoke:prod'], env);
}

main().catch((error) => {
  console.error('[prod-gate] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
