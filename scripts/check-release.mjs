import { spawn } from 'node:child_process';
import { buildLocalQaEnv } from './local-qa-env.mjs';

const LOCAL_BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const NPM_BIN = 'npm';

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const child = spawn(
      isWindows ? 'cmd.exe' : command,
      isWindows ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args,
      {
      stdio: 'inherit',
      env,
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForLocalServer(baseUrl, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Local server not ready after ${timeoutMs}ms`);
}

async function stopServer(server) {
  if (!server || !server.pid) return;

  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('cmd.exe', ['/d', '/s', '/c', `taskkill /PID ${server.pid} /T /F`], {
        stdio: 'ignore',
      });
      killer.on('close', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  if (!server.killed) {
    server.kill('SIGTERM');
  }
}

async function main() {
  await run(NPM_BIN, ['run', 'check']);

  const env = buildLocalQaEnv(process.env, LOCAL_BASE_URL);

  const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
    stdio: 'inherit',
    env,
  });

  try {
    await waitForLocalServer(LOCAL_BASE_URL);
    await run(NPM_BIN, ['run', 'smoke:local'], env);
  } finally {
    await stopServer(server);
  }

  if (process.env.RUN_PROD_SMOKE === '1') {
    await run(NPM_BIN, ['run', 'smoke:prod'], env);
  }
}

main().catch(error => {
  console.error('[release:verify] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

