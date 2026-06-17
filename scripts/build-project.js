import { execSync } from 'child_process';

const projectName = process.env.VERCEL_PROJECT_NAME || '';
console.log(`[Build Router] Detected Vercel Project Name: "${projectName}"`);

if (projectName.includes('landing')) {
  console.log('[Build Router] Executing build for @baristachaw/landing...');
  execSync('npm run build --workspace @baristachaw/landing', { stdio: 'inherit' });
} else {
  console.log('[Build Router] Executing build for @baristachaw/web...');
  execSync('npm run build --workspace @baristachaw/web', { stdio: 'inherit' });
}
