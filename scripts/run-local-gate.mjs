import { spawn } from 'node:child_process';
import { buildLocalQaEnv } from './local-qa-env.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const NPM_BIN = 'npm';

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

function startLocalServer(env) {
  return spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
    stdio: 'inherit',
    env,
  });
}

async function waitForServer(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL.replace(/\/+$/, '')}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Local server failed to start in time');
}

async function warmFrontend() {
  const base = BASE_URL.replace(/\/+$/, '');
  const routes = ['/', '/tools', '/chat', '/scanner', '/collection', '/@vite/client'];

  for (const route of routes) {
    const target = `${base}${route}`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch(target, { headers: { accept: 'text/html,application/javascript,*/*' } });
        if (res.ok) {
          await res.text();
          break;
        }
      } catch {
        // retry
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

async function stopServer(server) {
  if (!server || !server.pid) return;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('cmd.exe', ['/d', '/s', '/c', `taskkill /PID ${server.pid} /T /F`], { stdio: 'ignore' });
      killer.on('close', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }
  if (!server.killed) server.kill('SIGTERM');
}

async function main() {
  await run(NPM_BIN, ['run', 'check']);

  const env = buildLocalQaEnv(process.env, BASE_URL);

  const server = startLocalServer(env);

  try {
    await waitForServer();
    await warmFrontend();
    await run(NPM_BIN, ['run', 'smoke:local'], env);
    await run(NPM_BIN, ['run', 'test:e2e'], { ...env, BASE_URL });
    await run(NPM_BIN, ['run', 'test:e2e:mobile'], { ...env, BASE_URL });
    await run(NPM_BIN, ['run', 'test:a11y'], { ...env, BASE_URL });
  } finally {
    await stopServer(server);
  }

  const perfEnv = {
    ...env,
    NODE_ENV: 'production',
  };

  const perfServer = startLocalServer(perfEnv);

  try {
    await waitForServer();
    await run(NPM_BIN, ['run', 'test:perf'], { ...env, BASE_URL });
  } finally {
    await stopServer(perfServer);
  }
}

main().catch((error) => {
  console.error('[local-gate] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

