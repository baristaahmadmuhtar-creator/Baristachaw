import { execSync } from 'child_process';

const buildTarget = process.env.BUILD_TARGET || '';
const projectName = process.env.VERCEL_PROJECT_NAME || '';

console.log(`[Build Router] VERCEL_PROJECT_NAME: "${projectName}"`);
console.log(`[Build Router] BUILD_TARGET: "${buildTarget}"`);

if (buildTarget === 'landing' || projectName.toLowerCase().includes('landing')) {
  console.log('[Build Router] Executing build for @baristachaw/landing...');
  execSync('npm run build --workspace @baristachaw/landing', { stdio: 'inherit' });
} else {
  console.log('[Build Router] Executing build for @baristachaw/web...');
  execSync('npm run build --workspace @baristachaw/web', { stdio: 'inherit' });
}
