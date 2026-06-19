import { spawn } from 'node:child_process';

const BASE_URL = process.env.PWA_BASE_URL || 'http://127.0.0.1:4173';

function executable(name) {
  return name;
}

function quoteWindowsArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function spawnPortable(command, args, options) {
  if (process.platform === 'win32') {
    return spawn([executable(command), ...args.map(quoteWindowsArg)].join(' '), {
      stdio: options.stdio,
      env: options.env,
      shell: true,
      windowsHide: true,
    });
  }

  return spawn(executable(command), args, {
    stdio: options.stdio,
    env: options.env,
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnPortable(command, args, {
      stdio: 'inherit',
      env: options.env || process.env,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function startPreview() {
  return spawnPortable('npm', [
    'run',
    'preview',
    '--workspace',
    '@baristachaw/web',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_ENABLE_OFFLINE_SW: 'true',
    },
  });
}

async function waitForPreview(timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`PWA preview server did not become ready at ${BASE_URL}`);
}

async function stopProcess(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      killer.on('close', resolve);
      killer.on('error', resolve);
    });
    return;
  }
  child.kill('SIGTERM');
}

async function main() {
  await run('npm', ['run', 'build', '--workspace', '@baristachaw/web'], {
    env: {
      ...process.env,
      VITE_ENABLE_OFFLINE_SW: 'true',
    },
  });

  const preview = startPreview();
  try {
    await waitForPreview();
    await run('npx', ['playwright', 'test', 'tests/e2e/service-worker.spec.ts', '--project=chromium'], {
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: BASE_URL,
        PLAYWRIGHT_STATIC_BUILD: '1',
      },
    });
  } finally {
    await stopProcess(preview);
  }
}

main().catch((error) => {
  console.error('[pwa-tests] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
