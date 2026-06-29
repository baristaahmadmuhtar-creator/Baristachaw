import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');

test('landing is a separate non-PWA workspace', () => {
  const index = read('apps/landing/index.html');
  const packageJson = JSON.parse(read('apps/landing/package.json')) as { name?: string };
  assert.equal(packageJson.name, '@baristachaw/landing');
  assert.doesNotMatch(index, /rel=["']manifest["']/i);
  assert.doesNotMatch(index, /mobile-web-app-capable/i);
  assert.equal(fs.existsSync('apps/landing/public/manifest.json'), false);
  assert.equal(fs.existsSync('apps/landing/public/sw.js'), false);
});

test('landing routes product actions to the app domain', () => {
  const config = read('apps/landing/src/config.ts');
  const vercel = read('apps/landing/vercel.json');
  assert.match(config, /https:\/\/app\.baristachaw\.com/);
  assert.match(config, /tools\?tab=ai_brew/);
  assert.match(vercel, /https:\/\/app\.baristachaw\.com\/login/);
  assert.match(vercel, /https:\/\/app\.baristachaw\.com\/register/);
  assert.match(vercel, /https:\/\/app\.baristachaw\.com\/tools\?tab=ai_brew/);
});

test('landing includes required brewer coverage and honest evidence', () => {
  const brewerGrid = read('apps/landing/src/components/BrewerGrid.tsx');
  const app = read('apps/landing/src/App.tsx');
  const downloadPage = read('apps/landing/src/pages/DownloadPage.tsx');
  const widget = read('apps/landing/src/components/SupportChatWidget.tsx');
  for (const brewer of [
    'V60',
    'Kalita Wave',
    'Chemex',
    'Clever Dripper',
    'AeroPress',
    'Switch / MUGEN',
    'Origami',
    'April Brewer',
    'Melitta',
    'Kono Meimon',
    'French Press',
    'Moka Pot',
    'Toddy',
    'Batch Brewer',
    'Hario Siphon',
    'Espresso',
  ]) {
    assert.match(brewerGrid, new RegExp(brewer.replace('/', '\\/')));
  }
  assert.match(downloadPage, /RELEASE_VERSION/);
  assert.match(widget, /final cup quality still requires real brewing/i);
  assert.doesNotMatch(app, /perfect coffee guaranteed|100% accurate cup/i);
});

test('landing and app pricing consume the shared plan catalog', () => {
  const landingConfig = read('apps/landing/src/config.ts');
  const landingApp = read('apps/landing/src/App.tsx');
  const appBillingConfig = read('apps/web/src/services/billingConfig.ts');
  const sharedCatalog = read('packages/shared/src/planCatalog.ts');

  assert.match(landingConfig, /@baristachaw\/shared\/planCatalog/);
  assert.match(appBillingConfig, /@baristachaw\/shared\/planCatalog/);
  assert.match(landingApp, /PLAN_CATALOG/);
  assert.doesNotMatch(sharedCatalog, /Limited daily AI Brew/);
  assert.match(sharedCatalog, /AI Coach/);
  assert.doesNotMatch(sharedCatalog, /AI BREW COACH/);
});

test('landing manual payment proof keeps checkout draft token for upload validation', () => {
  const registerModal = read('apps/landing/src/components/RegisterModal.tsx');

  assert.match(
    registerModal,
    /setInvoice\(\{\s*\.\.\.data\.manualInvoice,\s*draftToken:\s*data\.draftToken/,
    'landing checkout must keep the top-level draftToken beside manualInvoice state',
  );
  assert.match(
    registerModal,
    /draftToken:\s*invoice\.draftToken\s*\|\|\s*''/,
    'landing proof upload must submit draftToken to /api/billing/proof',
  );
});

test('support flow is explicit about its public issue fallback', () => {
  const form = read('apps/landing/src/components/ContactForm.tsx');
  assert.match(form, /GitHub issue channel/);
  assert.match(form, /does not upload files automatically/);
  assert.match(form, /SUPPORT_ISSUE_URL/);
});
