import {
  APP_ENV_GROUPS,
  APP_OPTIONAL_ENV_GROUPS,
  FORBIDDEN_PUBLIC_SECRET_GROUPS,
  MOBILE_ENV_GROUPS,
  SMOKE_AUTH_ENV_GROUPS,
  checkForbiddenRuntimeEnv,
  checkForbiddenVercelEnvNames,
  checkRuntimeEnv,
  checkVercelEnvNames,
  loadEnvFiles,
  printSafeEnvReport,
} from './lib/env-check.mjs';

function readArg(name, fallback = '') {
  const prefix = `${name}=`;
  const item = process.argv.slice(2).find(arg => arg === name || arg.startsWith(prefix));
  if (!item) return fallback;
  if (item === name) return 'true';
  return item.slice(prefix.length);
}

function mergeReports(reports, { mode, target }) {
  const items = reports.flatMap(report => report.items);
  const commandError = reports.find(report => report.commandError)?.commandError;
  const errors = items.filter(item => item.level === 'fail');
  const warnings = items.filter(item => item.level === 'warn');
  return {
    ok: errors.length === 0 && !commandError,
    mode,
    target,
    items,
    errors,
    warnings,
    commandError,
  };
}

const mode = readArg('--mode', 'local');
const target = readArg('--target', 'production');
const includeSmokeAuth = process.argv.includes('--include-smoke-auth');

const runtimeGroups = [
  ...APP_ENV_GROUPS,
  ...MOBILE_ENV_GROUPS,
  ...(includeSmokeAuth || mode === 'final' || mode === 'runtime' ? SMOKE_AUTH_ENV_GROUPS : []),
];

let report;

if (mode === 'vercel') {
  const requiredForVercelApp = [
    ...APP_ENV_GROUPS,
    ...APP_OPTIONAL_ENV_GROUPS.filter(group => group.label === 'HEALTHCHECK_TOKEN'),
  ];
  report = mergeReports([
    checkVercelEnvNames(requiredForVercelApp, target),
    checkForbiddenVercelEnvNames(FORBIDDEN_PUBLIC_SECRET_GROUPS, target),
  ], { mode: 'vercel', target });
  printSafeEnvReport(report, { title: 'Baristachaw Vercel env-name check' });
} else if (mode === 'runtime') {
  report = mergeReports([
    checkRuntimeEnv(runtimeGroups, {
      env: process.env,
      mode,
      target: 'process.env',
      allowLocalUnavailable: false,
    }),
    checkForbiddenRuntimeEnv(FORBIDDEN_PUBLIC_SECRET_GROUPS, {
      env: process.env,
      mode,
      target: 'process.env',
    }),
  ], { mode, target: 'process.env' });
  printSafeEnvReport(report, { title: 'Baristachaw runtime env check' });
} else if (mode === 'final') {
  const vercelReport = mergeReports([
    checkVercelEnvNames([
      ...APP_ENV_GROUPS,
      ...APP_OPTIONAL_ENV_GROUPS.filter(group => group.label === 'HEALTHCHECK_TOKEN'),
    ], target),
    checkForbiddenVercelEnvNames(FORBIDDEN_PUBLIC_SECRET_GROUPS, target),
  ], { mode: 'vercel', target });
  const runtimeReport = mergeReports([
    checkRuntimeEnv(runtimeGroups, {
      env: process.env,
      mode: 'runtime',
      target: 'process.env',
      allowLocalUnavailable: false,
    }),
    checkForbiddenRuntimeEnv(FORBIDDEN_PUBLIC_SECRET_GROUPS, {
      env: process.env,
      mode: 'runtime',
      target: 'process.env',
    }),
  ], { mode: 'runtime', target: 'process.env' });
  report = mergeReports([vercelReport, runtimeReport], { mode, target });
  printSafeEnvReport(report, { title: 'Baristachaw final env gate' });
} else {
  const serverEnv = loadEnvFiles(['.vercel/.env.production.local', '.env.production.local', '.env.local', '.env']);
  const mobileEnv = loadEnvFiles(['apps/mobile/.env']);
  const localServerReport = mergeReports([
    checkRuntimeEnv(APP_ENV_GROUPS, {
      env: serverEnv,
      mode: 'local',
      target: 'local server env files + process.env',
      allowLocalUnavailable: false,
    }),
    checkForbiddenRuntimeEnv(FORBIDDEN_PUBLIC_SECRET_GROUPS, {
      env: serverEnv,
      mode: 'local',
      target: 'local server env files + process.env',
    }),
  ], { mode: 'local', target: 'local server env files + process.env' });
  const localMobileReport = checkRuntimeEnv(MOBILE_ENV_GROUPS, {
    env: mobileEnv,
    mode: 'local',
    target: 'apps/mobile/.env + process.env',
    allowLocalUnavailable: false,
  });
  report = mergeReports([localServerReport, localMobileReport], { mode: 'local', target: 'env files' });
  printSafeEnvReport(report, { title: 'Baristachaw local production env check' });
  console.log('Tip: use -- --mode=vercel for Vercel secret-name presence or -- --mode=runtime inside secure CI/runtime.');
}

process.exitCode = report.ok ? 0 : 1;
