import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const buildTarget = process.env.BUILD_TARGET || '';
const projectName = process.env.VERCEL_PROJECT_NAME || '';

console.log(`[Build Router] VERCEL_PROJECT_NAME: "${projectName}"`);
console.log(`[Build Router] BUILD_TARGET: "${buildTarget}"`);

function copyOutput(source) {
  if (fs.existsSync(source)) {
    console.log(`[Build Router] Copying ${source} to root dist...`);
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.cpSync(source, 'dist', { recursive: true });
  } else {
    console.log(`[Build Router] Warning: Expected output directory ${source} not found!`);
  }
}

if (buildTarget === 'landing' || projectName.toLowerCase().includes('landing')) {
  console.log('[Build Router] Executing build for @baristachaw/landing...');
  execSync('npm run build --workspace @baristachaw/landing', { stdio: 'inherit' });
  copyOutput('apps/landing/dist');
} else {
  console.log('[Build Router] Executing build for @baristachaw/web...');
  execSync('npm run build --workspace @baristachaw/web', { stdio: 'inherit' });
  copyOutput('apps/web/dist');
}
