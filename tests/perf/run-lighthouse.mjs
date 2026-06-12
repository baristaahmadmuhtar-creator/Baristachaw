import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { buildLocalQaEnv, normalizeLoopbackBaseUrl } from '../../scripts/local-qa-env.mjs';

const baseUrl = normalizeLoopbackBaseUrl(process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000');
const configPath = path.resolve('tests/perf/lighthouse.config.json');
const outDir = path.resolve('lighthouse-report');

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
await fs.mkdir(outDir, { recursive: true });

function startLocalServer(env) {
  return spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
    stdio: 'inherit',
    env,
  });
}

async function isServerHealthy(targetBaseUrl) {
  try {
    const res = await fetch(`${targetBaseUrl.replace(/\/+$/, '')}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(targetBaseUrl, timeoutMs = 45000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerHealthy(targetBaseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Local server failed to start for perf checks at ${targetBaseUrl}`);
}

async function stopServer(server) {
  if (!server?.pid) return;
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

let perfServer = null;
if (!(await isServerHealthy(baseUrl))) {
  perfServer = startLocalServer(buildLocalQaEnv({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
  }, baseUrl));
  await waitForServer(baseUrl);
}

try {
  const failures = [];

  for (const route of config.routes) {
    const target = `${baseUrl.replace(/\/+$/, '')}${route}`;
    let chrome = null;
    try {
      chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
      const result = await lighthouse(target, {
        port: chrome.port,
        output: ['json', 'html'],
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        emulatedFormFactor: 'mobile',
        throttlingMethod: 'simulate',
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      });

      if (!result?.report || !result.lhr) {
        failures.push(`${route} -> lighthouse returned empty report`);
        continue;
      }

      const safeName = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
      const [jsonReport, htmlReport] = Array.isArray(result.report) ? result.report : [result.report, ''];

      await fs.writeFile(path.join(outDir, `${safeName}.json`), jsonReport, 'utf8');
      if (htmlReport) await fs.writeFile(path.join(outDir, `${safeName}.html`), htmlReport, 'utf8');

      const scores = result.lhr.categories;
      const checks = [
        ['performance', config.thresholds.performance],
        ['accessibility', config.thresholds.accessibility],
        ['best-practices', config.thresholds['best-practices']],
        ['seo', config.thresholds.seo],
      ];

      for (const [key, threshold] of checks) {
        const score = Number(scores[key]?.score ?? 0);
        if (score < Number(threshold)) {
          failures.push(`${route} -> ${key} score ${score.toFixed(2)} below ${Number(threshold).toFixed(2)}`);
        }
      }

      console.log(`[perf] ${route} scores:`, {
        performance: scores.performance?.score,
        accessibility: scores.accessibility?.score,
        bestPractices: scores['best-practices']?.score,
        seo: scores.seo?.score,
      });
    } catch (error) {
      failures.push(`${route} -> lighthouse failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (chrome) {
        try {
          await chrome.kill();
        } catch (error) {
          console.warn(`[perf] ${route} chrome cleanup failed:`, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  if (failures.length) {
    console.error('[perf] threshold failures:');
    for (const fail of failures) console.error(`- ${fail}`);
    process.exitCode = 1;
  }
} finally {
  await stopServer(perfServer);
}
