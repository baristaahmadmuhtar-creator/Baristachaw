import { spawn } from 'node:child_process';
import { buildLocalQaEnv } from './local-qa-env.mjs';

const DEFAULT_BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const NPM_BIN = 'npm';

function phaseBaseUrl(offset) {
  if (process.env.BASE_URL) return DEFAULT_BASE_URL;
  const url = new URL(DEFAULT_BASE_URL);
  const basePort = Number.parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
  url.port = String(basePort + offset);
  return url.origin;
}

function portFromBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  if (parsed.port) return parsed.port;
  return parsed.protocol === 'https:' ? '443' : '80';
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const commandLine = [command, ...args]
      .map((arg) => /[\s"]/u.test(arg) ? `"${String(arg).replace(/"/g, '""')}"` : arg)
      .join(' ');
    const child = spawn(
      isWindows ? 'cmd.exe' : command,
      isWindows ? ['/d', '/s', '/c', commandLine] : args,
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

function runDirect(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function runPlaywright(args, env) {
  return runDirect(process.execPath, ['node_modules/playwright/cli.js', ...args], env);
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

async function withLocalServer(baseUrl, env, runChecks) {
  const serverEnv = {
    ...env,
    PORT: portFromBaseUrl(baseUrl),
  };
  const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
    stdio: 'inherit',
    env: serverEnv,
  });

  try {
    await waitForLocalServer(baseUrl);
    await runChecks(serverEnv);
  } finally {
    await stopServer(server);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function main() {
  await run(NPM_BIN, ['run', 'lint']);
  await run(NPM_BIN, [
    'run',
    'test:unit',
    '--',
    'tests/unit/aiBrewPlanner.test.ts',
    'tests/unit/aiAccessGate.test.ts',
    'tests/unit/adminManagementSchema.test.ts',
    'tests/unit/adminManagementHandler.test.ts',
    'tests/unit/smokeRunner.test.ts',
  ]);
  await run(NPM_BIN, ['run', 'build']);
  await run(NPM_BIN, ['run', 'catalog:audit']);

  const smokeBaseUrl = phaseBaseUrl(0);
  const desktopBaseUrl = phaseBaseUrl(1);
  const mobileBaseUrl = phaseBaseUrl(2);

  const smokeEnv = buildLocalQaEnv(process.env, smokeBaseUrl);
  const desktopEnv = buildLocalQaEnv(process.env, desktopBaseUrl);
  const mobileEnv = buildLocalQaEnv(process.env, mobileBaseUrl);

  await withLocalServer(smokeBaseUrl, smokeEnv, async (env) => {
    await run(NPM_BIN, ['run', 'smoke:local'], env);
  });
  await withLocalServer(desktopBaseUrl, desktopEnv, async (env) => {
    await runPlaywright([
      'test',
      'tests/e2e/tools.spec.ts',
      'tests/e2e/aiBrewHybrid.spec.ts',
      '--project=chromium',
    ], env);
  });
  await withLocalServer(mobileBaseUrl, mobileEnv, async (env) => {
    await runPlaywright([
      'test',
      'tests/e2e/mobile.spec.ts',
      '--project=Mobile Chrome',
      '-g',
      'mobile ai brew quick',
    ], env);
  });

  if (process.env.RUN_PROD_SMOKE === '1') {
    await run(NPM_BIN, ['run', 'smoke:prod'], buildLocalQaEnv(process.env, DEFAULT_BASE_URL));
  }
}

main().catch(error => {
  console.error('[release:verify] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

