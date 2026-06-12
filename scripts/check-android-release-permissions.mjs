import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BLOCKED_ANDROID_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.MANAGE_EXTERNAL_STORAGE',
];

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function extractPermissions(output) {
  const permissions = [];
  const sourcePermissionPattern = /<uses-permission\b([^>]*)\/?>/giu;
  let sourceMatch;
  while ((sourceMatch = sourcePermissionPattern.exec(output)) !== null) {
    const attributes = sourceMatch[1];
    if (/tools:node\s*=\s*["']remove["']/iu.test(attributes)) continue;
    const name = attributes.match(/android:name\s*=\s*["']([^"']+)["']/iu)?.[1];
    if (name) permissions.push(name);
  }

  const packagedPermissionPattern = /uses-permission(?:-sdk-\d+)?:[^\n]*name=['"]([^'"]+)['"]/giu;
  let packagedMatch;
  while ((packagedMatch = packagedPermissionPattern.exec(output)) !== null) {
    permissions.push(packagedMatch[1]);
  }

  return uniqueSorted(permissions);
}

export function findBlockedPermissions(permissions) {
  const blocked = new Set(BLOCKED_ANDROID_PERMISSIONS);
  return uniqueSorted(permissions.filter((permission) => blocked.has(permission)));
}

function findAndroidSdk() {
  return process.env.ANDROID_HOME
    || process.env.ANDROID_SDK_ROOT
    || (process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
      : path.join(os.homedir(), 'Android', 'Sdk'));
}

function findAapt() {
  const sdk = findAndroidSdk();
  const buildTools = path.join(sdk, 'build-tools');
  if (!existsSync(buildTools)) return null;
  const executable = process.platform === 'win32' ? 'aapt.exe' : 'aapt';
  const versions = readdirSync(buildTools, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  for (const version of versions) {
    const candidate = path.join(buildTools, version, executable);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function readApkPermissions(artifactPath) {
  const aapt = findAapt();
  if (!aapt) {
    throw new Error('Android aapt was not found. Install Android build-tools or set ANDROID_HOME.');
  }
  return execFileSync(aapt, ['dump', 'permissions', artifactPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function findLatestBundletoolInDirectory(directory) {
  if (!directory || !existsSync(directory)) return null;
  const candidates = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^bundletool(?:-all)?-[\d.]+\.jar$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  return candidates.length > 0 ? path.join(directory, candidates[0]) : null;
}

export function findBundletool({
  env = process.env,
  cwd = process.cwd(),
  sdk = findAndroidSdk(),
  tempDir = os.tmpdir(),
} = {}) {
  const candidates = [
    env.BUNDLETOOL_JAR,
    path.join(cwd, 'tools', 'bundletool-all.jar'),
    path.join(sdk, 'cmdline-tools', 'latest', 'lib', 'bundletool.jar'),
    findLatestBundletoolInDirectory(tempDir),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function readAabManifest(artifactPath) {
  const bundletool = findBundletool();
  if (!bundletool) {
    throw new Error(
      'bundletool was not found. Set BUNDLETOOL_JAR, place tools/bundletool-all.jar, '
      + 'or download bundletool-all-<version>.jar into the system temp directory.',
    );
  }
  return execFileSync('java', [
    '-jar',
    bundletool,
    'dump',
    'manifest',
    `--bundle=${artifactPath}`,
    '--module=base',
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseArtifactArgument(args) {
  const explicit = args.find((arg) => arg.startsWith('--artifact='));
  if (explicit) return explicit.slice('--artifact='.length);
  const index = args.indexOf('--artifact');
  return index >= 0 ? args[index + 1] : null;
}

function resolveDefaultArtifact() {
  const candidates = [
    'apps/mobile/android/app/build/outputs/bundle/release/app-release.aab',
    'apps/mobile/android/app/build/outputs/apk/release/app-release.apk',
    'apps/mobile/android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml',
    'apps/mobile/android/app/src/main/AndroidManifest.xml',
  ];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

export function auditAndroidArtifact(artifactPath) {
  const extension = path.extname(artifactPath).toLowerCase();
  const output = extension === '.apk'
    ? readApkPermissions(artifactPath)
    : extension === '.aab'
      ? readAabManifest(artifactPath)
      : readFileSync(artifactPath, 'utf8');
  const permissions = extractPermissions(output);
  return {
    artifactPath,
    permissions,
    blockedPermissions: findBlockedPermissions(permissions),
  };
}

function main() {
  const artifactPath = parseArtifactArgument(process.argv.slice(2)) || resolveDefaultArtifact();
  if (!artifactPath || !existsSync(artifactPath)) {
    throw new Error('No Android APK, AAB, or manifest artifact was found.');
  }

  const result = auditAndroidArtifact(path.resolve(artifactPath));
  console.log(`[android-permissions] artifact=${result.artifactPath}`);
  console.log(`[android-permissions] permissions=${result.permissions.join(', ') || 'none'}`);
  if (result.blockedPermissions.length > 0) {
    console.error(`[android-permissions] blocked=${result.blockedPermissions.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('[android-permissions] blocked=none');
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(`[android-permissions] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
