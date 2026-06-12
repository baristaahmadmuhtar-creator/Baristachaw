const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

const PROJECT_ROOT_DEFINITION =
  'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()';
const WORKSPACE_ROOT_DEFINITION =
  'def workspaceRoot = rootDir.getAbsoluteFile().getParentFile().getParentFile().getParentFile().getAbsolutePath()';
const ROOT_CONFIGURATION = '    root = file(workspaceRoot)';
const RELEASE_SIGNING_DEFINITIONS = [
  "def releaseStoreFilePath = findProperty('BARISTACHAW_RELEASE_STORE_FILE') ?: System.getenv('BARISTACHAW_RELEASE_STORE_FILE')",
  "def releaseStorePassword = findProperty('BARISTACHAW_RELEASE_STORE_PASSWORD') ?: System.getenv('BARISTACHAW_RELEASE_STORE_PASSWORD')",
  "def releaseKeyAlias = findProperty('BARISTACHAW_RELEASE_KEY_ALIAS') ?: System.getenv('BARISTACHAW_RELEASE_KEY_ALIAS')",
  "def releaseKeyPassword = findProperty('BARISTACHAW_RELEASE_KEY_PASSWORD') ?: System.getenv('BARISTACHAW_RELEASE_KEY_PASSWORD')",
  'def hasReleaseSigning = releaseStoreFilePath && releaseStorePassword && releaseKeyAlias && releaseKeyPassword',
  'def requiresReleaseSigning = gradle.startParameter.taskNames.any { taskName ->',
  '    def normalized = taskName.toLowerCase()',
  "    normalized.contains('assemblerelease') || normalized.contains('bundlerelease') || normalized.contains('installrelease')",
  '}',
  '',
  'if (requiresReleaseSigning && !hasReleaseSigning) {',
  "    throw new GradleException('Release signing credentials are required for production Android builds.')",
  '}',
].join('\n');
const RELEASE_SIGNING_CONFIG = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (hasReleaseSigning) {
                storeFile file(releaseStoreFilePath)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }
    }
`;
const BLOCKED_STORE_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.MANAGE_EXTERNAL_STORAGE',
];

function ensureAndroidMonorepoReleaseBundle(contents) {
  let nextContents = contents;

  if (!nextContents.includes(WORKSPACE_ROOT_DEFINITION)) {
    nextContents = nextContents.replace(
      PROJECT_ROOT_DEFINITION,
      `${PROJECT_ROOT_DEFINITION}\n${WORKSPACE_ROOT_DEFINITION}`
    );
  }

  if (!nextContents.includes('BARISTACHAW_RELEASE_STORE_FILE')) {
    nextContents = nextContents.replace(
      WORKSPACE_ROOT_DEFINITION,
      `${WORKSPACE_ROOT_DEFINITION}\n${RELEASE_SIGNING_DEFINITIONS}`
    );
  }

  if (!/^\s*root\s*=\s*file\(workspaceRoot\)/m.test(nextContents)) {
    nextContents = nextContents.replace('react {\n', `react {\n${ROOT_CONFIGURATION}\n`);
  }

  const signingConfigStart = nextContents.indexOf('    signingConfigs {');
  const buildTypesStart = nextContents.indexOf('    buildTypes {', signingConfigStart);
  if (signingConfigStart >= 0 && buildTypesStart > signingConfigStart) {
    nextContents = `${nextContents.slice(0, signingConfigStart)}${RELEASE_SIGNING_CONFIG}${nextContents.slice(buildTypesStart)}`;
  }

  const nextBuildTypesStart = nextContents.indexOf('    buildTypes {');
  const packagingOptionsStart = nextContents.indexOf('    packagingOptions {', nextBuildTypesStart);
  if (nextBuildTypesStart >= 0 && packagingOptionsStart > nextBuildTypesStart) {
    const buildTypesBlock = nextContents.slice(nextBuildTypesStart, packagingOptionsStart);
    const releaseWithSigning = /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.[A-Za-z0-9_]+/.test(buildTypesBlock)
      ? buildTypesBlock.replace(
          /(release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.[A-Za-z0-9_]+/,
          '$1signingConfigs.release'
        )
      : buildTypesBlock.replace(
          /release\s*\{/,
          'release {\n            signingConfig signingConfigs.release'
        );
    nextContents = `${nextContents.slice(0, nextBuildTypesStart)}${releaseWithSigning}${nextContents.slice(packagingOptionsStart)}`;
  }

  return nextContents;
}

function ensureBlockedStorePermissions(androidManifest) {
  const manifest = androidManifest.manifest;
  manifest.$ = manifest.$ || {};
  manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
  const permissions = manifest['uses-permission'] || [];
  const byName = new Map(
    permissions
      .filter((permission) => permission?.$?.['android:name'])
      .map((permission) => [permission.$['android:name'], permission])
  );

  for (const permissionName of BLOCKED_STORE_PERMISSIONS) {
    let permission = byName.get(permissionName);
    if (!permission) {
      permission = { $: { 'android:name': permissionName } };
      permissions.push(permission);
    }
    permission.$['tools:node'] = 'remove';
  }

  manifest['uses-permission'] = permissions;
  return androidManifest;
}

module.exports = function withAndroidMonorepoReleaseBundle(config) {
  const withGradle = withAppBuildGradle(config, (nextConfig) => {
    nextConfig.modResults.contents = ensureAndroidMonorepoReleaseBundle(
      nextConfig.modResults.contents
    );
    return nextConfig;
  });

  return withAndroidManifest(withGradle, (nextConfig) => {
    nextConfig.modResults = ensureBlockedStorePermissions(nextConfig.modResults);
    return nextConfig;
  });
};

module.exports.ensureAndroidMonorepoReleaseBundle = ensureAndroidMonorepoReleaseBundle;
