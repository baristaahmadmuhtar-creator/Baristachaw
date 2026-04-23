const { withAppBuildGradle } = require('@expo/config-plugins');

const PROJECT_ROOT_DEFINITION =
  'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()';
const WORKSPACE_ROOT_DEFINITION =
  'def workspaceRoot = rootDir.getAbsoluteFile().getParentFile().getParentFile().getParentFile().getAbsolutePath()';
const ROOT_CONFIGURATION = '    root = file(workspaceRoot)';

function ensureAndroidMonorepoReleaseBundle(contents) {
  let nextContents = contents;

  if (!nextContents.includes(WORKSPACE_ROOT_DEFINITION)) {
    nextContents = nextContents.replace(
      PROJECT_ROOT_DEFINITION,
      `${PROJECT_ROOT_DEFINITION}\n${WORKSPACE_ROOT_DEFINITION}`
    );
  }

  if (!/^\s*root\s*=\s*file\(workspaceRoot\)/m.test(nextContents)) {
    nextContents = nextContents.replace('react {\n', `react {\n${ROOT_CONFIGURATION}\n`);
  }

  return nextContents;
}

module.exports = function withAndroidMonorepoReleaseBundle(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = ensureAndroidMonorepoReleaseBundle(
      config.modResults.contents
    );
    return config;
  });
};
